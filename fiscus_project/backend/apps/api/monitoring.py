"""
API endpoints for real-time task monitoring.

Provides REST endpoints for:
- Getting task status
- Listing active tasks
- Task statistics
"""
import logging
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Count
from datetime import timedelta
from django.utils import timezone

from apps.core.models import TaskLog

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def task_status(request, task_id: str):
    """
    GET /api/admin/tasks/{task_id}/
    
    Get status of a specific task.
    
    Returns:
    {
        "task_id": "abc123",
        "task_name": "Scrape ATB (вул. Городоцька, 48)",
        "status": "progress",
        "items_total": 100,
        "items_processed": 45,
        "items_failed": 2,
        "progress_percent": 45,
        "message": "Currently processing...",
        "error_message": null,
        "created_at": "2026-02-18T10:00:00Z",
        "started_at": "2026-02-18T10:00:05Z",
        "completed_at": null,
        "is_complete": false
    }
    """
    try:
        log = TaskLog.objects.get(task_id=task_id)
        
        return Response({
            "task_id": log.task_id,
            "task_name": log.task_name,
            "status": log.status,
            "items_total": log.items_total,
            "items_processed": log.items_processed,
            "items_failed": log.items_failed,
            "progress_percent": log.progress_percent,
            "message": log.message,
            "error_message": log.error_message or None,
            "created_at": log.created_at.isoformat(),
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None,
            "is_complete": log.is_complete,
        })
    except TaskLog.DoesNotExist:
        return Response(
            {"error": f"Task {task_id} not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def task_list(request):
    """
    GET /api/admin/tasks/?status=progress&limit=10
    
    List tasks with optional filtering.
    
    Query Parameters:
    - status: Filter by status (pending, started, progress, completed, failed)
    - store_id: Filter by store ID
    - limit: Number of results (default: 20)
    - offset: For pagination (default: 0)
    
    Returns:
    [
        {
            "task_id": "abc123",
            "task_name": "Scrape ATB",
            "status": "progress",
            "progress_percent": 45,
            "items_total": 100,
            "items_processed": 45,
            "created_at": "2026-02-18T10:00:00Z"
        },
        ...
    ]
    """
    # Get query parameters
    status_filter = request.query_params.get('status')
    store_id = request.query_params.get('store_id')
    limit = int(request.query_params.get('limit', 20))
    offset = int(request.query_params.get('offset', 0))
    
    # Build query
    queryset = TaskLog.objects.all()
    
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    if store_id:
        queryset = queryset.filter(store_id=store_id)
    
    # Order by newest first
    queryset = queryset.order_by('-created_at')
    
    # Pagination
    total_count = queryset.count()
    tasks = queryset[offset:offset + limit]
    
    return Response({
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "tasks": [
            {
                "task_id": log.task_id,
                "task_name": log.task_name,
                "status": log.status,
                "progress_percent": log.progress_percent,
                "items_total": log.items_total,
                "items_processed": log.items_processed,
                "items_failed": log.items_failed,
                "created_at": log.created_at.isoformat(),
                "store_id": log.store_id,
            }
            for log in tasks
        ]
    })


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def task_stats(request):
    """
    GET /api/admin/tasks/stats/
    
    Get aggregate statistics about tasks.
    
    Returns:
    {
        "total_tasks": 150,
        "active_tasks": 5,
        "completed_today": 20,
        "failed_tasks": 3,
        "total_items_processed": 5000,
        "by_status": {
            "completed": 120,
            "failed": 3,
            "progress": 5,
            "pending": 22
        },
        "success_rate": 97.6
    }
    """
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_tasks = TaskLog.objects.count()
    active_tasks = TaskLog.objects.filter(
        status__in=['pending', 'started', 'progress']
    ).count()
    completed_today = TaskLog.objects.filter(
        status='completed',
        completed_at__gte=today_start
    ).count()
    failed_tasks = TaskLog.objects.filter(status='failed').count()
    
    total_items = TaskLog.objects.aggregate(
        total=Count('items_processed')
    )['total'] or 0
    
    by_status = dict(
        TaskLog.objects.values('status').annotate(
            count=Count('id')
        ).values_list('status', 'count')
    )
    
    # Calculate success rate
    completed = TaskLog.objects.filter(status='completed').count()
    failed = TaskLog.objects.filter(status='failed').count()
    total_finished = completed + failed
    success_rate = (completed / total_finished * 100) if total_finished > 0 else 0
    
    return Response({
        "total_tasks": total_tasks,
        "active_tasks": active_tasks,
        "completed_today": completed_today,
        "failed_tasks": failed_tasks,
        "total_items_processed": total_items,
        "by_status": by_status,
        "success_rate": round(success_rate, 1)
    })


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def task_logs(request, store_id: int):
    """
    GET /api/admin/stores/{store_id}/task-logs/
    
    Get all task logs for a specific store, ordered by newest first.
    
    Returns:
    [
        {
            "task_id": "abc123",
            "task_name": "Scrape ATB",
            "status": "completed",
            "items_total": 100,
            "items_processed": 100,
            "items_failed": 0,
            "created_at": "2026-02-18T10:00:00Z",
            "completed_at": "2026-02-18T10:15:00Z"
        },
        ...
    ]
    """
    logs = TaskLog.objects.filter(store_id=store_id).order_by('-created_at')[:30]
    
    return Response([
        {
            "task_id": log.task_id,
            "task_name": log.task_name,
            "status": log.status,
            "items_total": log.items_total,
            "items_processed": log.items_processed,
            "items_failed": log.items_failed,
            "message": log.message,
            "error_message": log.error_message or None,
            "created_at": log.created_at.isoformat(),
            "completed_at": log.completed_at.isoformat() if log.completed_at else None,
        }
        for log in logs
    ])
