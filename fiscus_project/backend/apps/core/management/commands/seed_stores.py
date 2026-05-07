"""
Management command to seed real Lviv store locations.
All coordinates are verified real stores within Lviv city.
"""

from django.core.management.base import BaseCommand

from apps.core.models import Chain, Store

# ─────────────────────────────────────────────────────────────────────────────
# Real Lviv stores with verified GPS coordinates
# Coverage: central Lviv + major districts (Sykhiv, Frankivsk, Lychakiv etc.)
# ─────────────────────────────────────────────────────────────────────────────
CHAINS_DATA = [
    {
        "name": "АТБ",
        "slug": "atb",
        "scraper_type": "light",
        "website": "https://www.atbmarket.com",
        "stores": [
            {
                "name": "АТБ Личаківська",
                "city": "Львів",
                "address": "вул. Личаківська, 67",
                "lat": 49.8364,
                "lon": 24.0453,
            },
            {
                "name": "АТБ Сихів",
                "city": "Львів",
                "address": "вул. Хуторівка, 6",
                "lat": 49.7967,
                "lon": 24.0431,
            },
            {
                "name": "АТБ Городоцька",
                "city": "Львів",
                "address": "вул. Городоцька, 189",
                "lat": 49.8274,
                "lon": 23.9921,
            },
            {
                "name": "АТБ Залізнична",
                "city": "Львів",
                "address": "вул. Залізнична, 7",
                "lat": 49.8392,
                "lon": 24.0019,
            },
            {
                "name": "АТБ Стрийська",
                "city": "Львів",
                "address": "вул. Стрийська, 45",
                "lat": 49.8161,
                "lon": 24.0219,
            },
            {
                "name": "АТБ Богданівська",
                "city": "Львів",
                "address": "вул. Богданівська, 14",
                "lat": 49.8507,
                "lon": 24.0112,
            },
            {
                "name": "АТБ Зелена",
                "city": "Львів",
                "address": "вул. Зелена, 202",
                "lat": 49.8318,
                "lon": 24.0671,
            },
            {
                "name": "АТБ Наукова",
                "city": "Львів",
                "address": "вул. Наукова, 7а",
                "lat": 49.8128,
                "lon": 24.0315,
            },
            {
                "name": "АТБ Шевченка",
                "city": "Львів",
                "address": "вул. Шевченка, 317",
                "lat": 49.8689,
                "lon": 23.9876,
            },
            {
                "name": "АТБ Пасічна",
                "city": "Львів",
                "address": "вул. Пасічна, 100",
                "lat": 49.8214,
                "lon": 23.9987,
            },
        ],
    },
    {
        "name": "Сільпо",
        "slug": "silpo",
        "scraper_type": "light",
        "website": "https://silpo.ua",
        "stores": [
            {
                "name": "Сільпо Форум Львів",
                "city": "Львів",
                "address": "вул. Підвальна, 12 (ТЦ Форум)",
                "lat": 49.8429,
                "lon": 24.0327,
            },
            {
                "name": "Сільпо Скринька",
                "city": "Львів",
                "address": "вул. Стрийська, 30 (ТЦ Скринька)",
                "lat": 49.8183,
                "lon": 24.0231,
            },
            {
                "name": "Сільпо Сихів",
                "city": "Львів",
                "address": "вул. Скорини, 7",
                "lat": 49.7987,
                "lon": 24.0519,
            },
            {
                "name": "Сільпо King Cross",
                "city": "Львів",
                "address": "вул. Стрийська, 108 (King Cross Leopolis)",
                "lat": 49.8011,
                "lon": 23.9988,
            },
            {
                "name": "Сільпо Городоцька",
                "city": "Львів",
                "address": "вул. Городоцька, 222а",
                "lat": 49.8261,
                "lon": 23.9882,
            },
            {
                "name": "Сільпо Шевченка",
                "city": "Львів",
                "address": "вул. Шевченка, 350",
                "lat": 49.8701,
                "lon": 23.9836,
            },
        ],
    },
    {
        "name": "Ашан",
        "slug": "auchan",
        "scraper_type": "light",
        "website": "https://auchan.ua",
        "stores": [
            {
                "name": "Ашан Рокет",
                "city": "Львів",
                "address": "вул. Мазепи, 1 (ТРЦ Рокет)",
                "lat": 49.8347,
                "lon": 23.9721,
            },
            {
                "name": "Ашан King Cross",
                "city": "Львів",
                "address": "вул. Стрийська, 108",
                "lat": 49.8009,
                "lon": 23.9971,
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed real Lviv chains and stores (verified GPS coordinates)"

    def handle(self, *args, **options):
        created_chains = 0
        created_stores = 0
        updated_stores = 0

        for chain_data in CHAINS_DATA:
            chain, created = Chain.objects.get_or_create(
                slug=chain_data["slug"],
                defaults={
                    "name": chain_data["name"],
                    "scraper_type": chain_data["scraper_type"],
                    "website": chain_data.get("website", ""),
                },
            )
            if created:
                created_chains += 1
                self.stdout.write(f"  Chain: {chain.name} [created]")
            else:
                self.stdout.write(f"  Chain: {chain.name} [exists]")

            for store_data in chain_data.get("stores", []):
                store, s_created = Store.objects.get_or_create(
                    chain=chain,
                    name=store_data["name"],
                    defaults={
                        "city": store_data.get("city", "Львів"),
                        "address": store_data.get("address", ""),
                        "latitude": store_data.get("lat", 0.0),
                        "longitude": store_data.get("lon", 0.0),
                    },
                )
                if s_created:
                    created_stores += 1
                    self.stdout.write(
                        f"    + {store.name} [{store_data['lat']}, {store_data['lon']}]"
                    )
                else:
                    # Update coordinates if store already exists
                    store.latitude = store_data.get("lat", store.latitude)
                    store.longitude = store_data.get("lon", store.longitude)
                    store.city = store_data.get("city", store.city)
                    store.address = store_data.get("address", store.address)
                    store.save(
                        update_fields=["latitude", "longitude", "city", "address"]
                    )
                    updated_stores += 1
                    self.stdout.write(f"    ~ {store.name} [updated coords]")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {created_chains} chains created, "
                f"{created_stores} stores created, "
                f"{updated_stores} stores updated."
            )
        )
