"""
Novus scraper — uses the public Novus JSON API (Zakaz.ua platform).
Endpoint: https://stores-api.zakaz.ua / https://novus.zakaz.ua
"""

import asyncio
import logging

from apps.scraper.services import ingest_scraped_data
from asgiref.sync import async_to_sync, sync_to_async

from .client import UniversalScraperClient
from .factory import register

logger = logging.getLogger(__name__)

# Novus uses Zakaz.ua backend — same as Metro
BASE_URL = "https://stores-api.zakaz.ua"
STORE_ID = "48215611"  # Novus Lviv store ID on Zakaz platform

PER_PAGE = 48
MAX_PAGES_PER_CATEGORY = 20
MAX_CONCURRENT_CATEGORIES = 3
MAX_CONCURRENT_PAGES = 4

API_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "uk-UA,uk;q=0.9",
    "Origin": "https://novus.zakaz.ua",
    "Referer": "https://novus.zakaz.ua/",
}

# Food categories on Zakaz/Novus platform
FOOD_CATEGORIES = [
    ("fruits-vegetables", "Овочі та фрукти"),
    ("bread-pastries", "Хліб та випічка"),
    ("dairy-eggs", "Молочні продукти"),
    ("meat", "М'ясо"),
    ("poultry", "Птиця"),
    ("fish-seafood", "Риба та морепродукти"),
    ("sausages-cold-cuts", "Ковбаса та делікатеси"),
    ("cheeses", "Сири"),
    ("grocery", "Бакалія"),
    ("frozen", "Заморожені продукти"),
    ("sweets-snacks", "Кондитерські вироби"),
    ("beverages", "Напої"),
    ("coffee-tea", "Кава та чай"),
    ("baby-food", "Дитяче харчування"),
    ("ready-meals", "Готові страви"),
    ("oils-sauces", "Олії та соуси"),
]

NON_FOOD_KEYWORDS = [
    "household",
    "hygiene",
    "cosmetics",
    "pets",
    "tobacco",
    "alcohol",
    "pharmacy",
    "electronics",
    "stationery",
    "clothing",
]


@register("novus")
class NovusScraper:
    CHAIN_NAME = "Новус"
    CHAIN_SLUG = "novus"

    def __init__(self, shop_id: str = "1"):
        self.shop_id = shop_id
        self.store_api_id = STORE_ID

    def close(self):
        pass

    def start(self):
        self.scrape()

    def scrape(self):
        async_to_sync(self._run)()
        print(f"[{self.CHAIN_NAME}] Parsing complete.")

    async def _run(self):
        client = UniversalScraperClient(
            max_concurrent_requests=5,
            min_jitter=0.5,
            max_jitter=1.5,
            max_retries=3,
        )
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_CATEGORIES)

        is_scraped_async = sync_to_async(
            lambda slug, sid, cat, h: __import__(
                "apps.scraper.services", fromlist=["is_category_scraped"]
            ).is_category_scraped(slug, sid, cat, h)
        )
        ingest_async = sync_to_async(ingest_scraped_data)

        from apps.scraper.services import is_category_scraped

        is_scraped_async = sync_to_async(is_category_scraped)

        print(
            f"[{self.CHAIN_NAME}] Starting. Store API ID: {self.store_api_id}",
            flush=True,
        )
        print(f"[{self.CHAIN_NAME}] Categories: {len(FOOD_CATEGORIES)}", flush=True)

        tasks = [
            self._scrape_category(
                client, semaphore, slug, name, ingest_async, is_scraped_async
            )
            for slug, name in FOOD_CATEGORIES
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _scrape_category(
        self, client, semaphore, cat_slug, cat_name, ingest_async, is_scraped_async
    ):
        if await is_scraped_async(self.CHAIN_SLUG, 0, cat_name, 12):
            print(
                f"[{self.CHAIN_NAME}] SKIP: '{cat_name}' (already scraped recently)",
                flush=True,
            )
            return

        print(f"[{self.CHAIN_NAME}] START: '{cat_name}'", flush=True)
        async with semaphore:
            products = []
            page = 1
            while page <= MAX_PAGES_PER_CATEGORY:
                page_products, has_more = await self._fetch_page(
                    client, cat_slug, cat_name, page
                )
                products.extend(page_products)
                if not page_products or not has_more:
                    break
                page += 1

        if products:
            seen = set()
            unique = [
                p
                for p in products
                if p["external_store_id"] not in seen
                and not seen.add(p["external_store_id"])
            ]
            print(
                f"[{self.CHAIN_NAME}] SAVE: {len(unique)} items for '{cat_name}'",
                flush=True,
            )
            await ingest_async(unique, self.CHAIN_SLUG, 0)

    async def _fetch_page(self, client, cat_slug, cat_name, page):
        """Fetch one page from Zakaz.ua API for Novus."""
        url = f"{BASE_URL}/stores/{self.store_api_id}/products/"
        params = {
            "category": cat_slug,
            "page": page,
            "per_page": PER_PAGE,
            "lang": "uk",
        }
        resp = await client.fetch(url, params=params, headers=API_HEADERS)
        if not resp or resp.status_code != 200:
            return [], False

        try:
            data = resp.json()
            results = (
                data.get("results") or data.get("products") or data.get("items") or []
            )
            if not results:
                return [], False

            products = []
            for item in results:
                p = self._parse_item(item, cat_name)
                if p:
                    products.append(p)

            has_more = bool(data.get("next")) or (
                page * PER_PAGE < data.get("count", 0)
            )
            return products, has_more
        except Exception as e:
            logger.warning(
                f"[{self.CHAIN_NAME}] Parse error page {page} cat {cat_slug}: {e}"
            )
            return [], False

    def _parse_item(self, item: dict, cat_name: str) -> dict | None:
        pid = item.get("sku") or item.get("id") or item.get("external_id")
        if not pid:
            return None

        title = item.get("title") or item.get("name") or ""
        if not title:
            return None

        price_raw = (
            item.get("price")
            or item.get("current_price")
            or (item.get("prices") or {}).get("price")
            or 0
        )
        try:
            price = (
                float(price_raw) / 100 if float(price_raw) > 500 else float(price_raw)
            )
        except (TypeError, ValueError):
            return None
        if price <= 0:
            return None

        old_price_raw = (
            item.get("old_price")
            or item.get("original_price")
            or (item.get("prices") or {}).get("old_price")
        )
        try:
            old_price = (
                float(old_price_raw) / 100
                if old_price_raw and float(old_price_raw) > 500
                else (float(old_price_raw) if old_price_raw else None)
            )
        except (TypeError, ValueError):
            old_price = None

        image_url = (
            item.get("img")
            or item.get("image")
            or item.get("image_url")
            or (
                (item.get("images") or [{}])[0].get("url") if item.get("images") else ""
            )
            or ""
        )

        product_url = item.get("web_url") or item.get("url") or ""
        if product_url and not product_url.startswith("http"):
            product_url = f"https://novus.zakaz.ua{product_url}"

        return {
            "external_store_id": str(pid),
            "title": str(title),
            "image_url": image_url,
            "url": product_url,
            "price": price,
            "old_price": old_price,
            "description": item.get("weight") or item.get("unit") or "",
            "category": cat_name,
            "is_sale": old_price is not None and old_price > price,
            "in_stock": item.get("in_stock", True),
        }
