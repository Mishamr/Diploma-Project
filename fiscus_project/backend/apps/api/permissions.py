"""
API permissions.
"""

from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Only allow owners of an object to access it."""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsPremiumUser(BasePermission):
    """Allow access only to premium users."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # For now, all authenticated users are "premium"
        return True
