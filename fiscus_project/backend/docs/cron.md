# Scraping Architecture & Scheduling Guide

## 1. Automated Scheduling (Cron / Celery Beat)

The scraper is configured to run automatically every day at **23:50**.

### Method A: Docker Compose (Preferred)
The `celery-beat` container handles scheduling automatically via `config/settings.py`.
Ensure the container is running:
```bash
docker-compose up -d celery_beat
```

### Method B: System Cron (Linux)
If running without Docker, add this line to your crontab (`crontab -e`):

```bash
50 23 * * * cd /path/to/project && /path/to/venv/bin/python manage.py run_scheduler >> /var/log/fiscus-scraper.log 2>&1
```

### Method C: Standalone Service
We provide a Python script using the `schedule` library if you prefer a simple long-running process:

```bash
python manage.py run_scheduler
```
*This will keep the terminal open and run the job at 23:50 daily.*

---

## 2. Manager Tools (RBAC)

### Access Control
- **User Role**: Read-Only access to products.
- **Manager Role**: Full access + Scraper Control.
    - Must be `is_staff=True` OR belong to `Managers` group.

### Force Update
If the scraper failed or you need immediate data, use the Manager API:

**Endpoint:** `POST /api/v1/scraper/run/`
**Headers:** `Authorization: Bearer <token>`

```bash
curl -X POST http://localhost:8000/api/v1/scraper/run/ \
     -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```

---

## 3. Anti-Bug Protocol (Validation)

All scraped data passes through a strict Pydantic validation layer (`apps/scraper/schemas.py`).
- **Rejected:** Prices <= 0, missing titles, invalid formats.
- **Logged:** Validation failures are logged to `apps.scraper.services`.
- **Out of Stock:** Items not found in the latest scrape are marked `is_available=False` rather than deleted.
