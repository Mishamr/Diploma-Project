# Cron / Celery Beat Schedule

## Nightly Scrape
- **Task**: `apps.scraper.tasks.scrape_all_stores_nightly`
- **Schedule**: Every day at 02:00 Kyiv time
- **Queue**: `light` (dispatches individual tasks to correct queues)
- **What it does**: Iterates all active chains and stores, dispatches scrape tasks

## Queue Configuration

| Queue   | Worker          | Concurrency | Memory | Used By |
|---------|-----------------|-------------|--------|---------|
| `light` | `celery_worker` | 4           | 512MB  | ATB, Novus, Varus, Fora, Eko, Tavria V |
| `heavy` | `celery_heavy`  | 2           | 1GB    | Silpo, Auchan, Metro, Velmart |

## Setup
Configure via Django Admin → Periodic Tasks, or:

```python
from django_celery_beat.models import PeriodicTask, CrontabSchedule

schedule, _ = CrontabSchedule.objects.get_or_create(
    hour=2, minute=0,
    timezone='Europe/Kyiv',
)

PeriodicTask.objects.get_or_create(
    name='Nightly scrape all stores',
    defaults={
        'crontab': schedule,
        'task': 'apps.scraper.tasks.scrape_all_stores_nightly',
    },
)
```
