"""
Rukavychka (Рукавичка) scraper — uses the public Rukavychka JSON API.
Site: https://rukavychka.ua
API: REST JSON, category-based pagination.
"""

import asyncio
import logging

from apps.scraper.services import ingest_scraped_data
from asgiref.sync import async_to_sync, sync_to_async

from .client import UniversalScraperClient
from .factory import register

logger = logging.getLogger(__name__)

BASE_URL = "https://rukavychka.ua"
API_BASE = "https://rukavychka.ua/api"

PER_PAGE = 40
MAX_PAGES_PER_CATEGORY = 25
MAX_CONCURRENT_CATEGORIES = 3

API_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "uk-UA,uk;q=0.9",
    "Origin": "https://rukavychka.ua",
    "Referer": "https://rukavychka.ua/",
    "X-Requested-With": "XMLHttpRequest",
}

# Rukavychka category IDs (verified from site navigation)
FOOD_CATEGORIES = [
    (1, "Хліб та випічка"),
    (2, "Молочні продукти"),
    (3, "М'ясо"),
    (4, "Ковбаса та делікатеси"),
    (5, "Сири"),
    (6, "Риба та морепродукти"),
    (7, "Овочі та фрукти"),
    (8, "Бакалія"),
    (9, "Кондитерські вироби"),
    (10, "Напої"),
    (11, "Кава та чай"),
    (12, "Заморожені продукти"),
    (13, "Готові страви"),
    (14, "Дитяче харчування"),
    (15, "Олії та соуси"),
]


@register("rukavychka")
class RukavychkaScraper:
    CHAIN_NAME = "Рукавичка"
    CHAIN_SLUG = "rukavychka"

    def __init__(self, shop_id: str = "1"):
        self.shop_id = shop_id

    def close(self):
        pass

    def start(self):
        self.scrape()

    def scrape(self):
        async_to_sync(self._run)()
        print(f"[{self.CHAIN_NAME}] Parsing complete.")

    async def _run(self):
        client = UniversalScraperClient(
            max_concurrent_requests=4,
            min_jitter=0.8,
            max_jitter=2.0,
            max_retries=3,
        )
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_CATEGORIES)

        from apps.scraper.services import is_category_scraped

        is_scraped_async = sync_to_async(is_category_scraped)
        ingest_async = sync_to_async(ingest_scraped_data)

        print(f"[{self.CHAIN_NAME}] Starting scraper...", flush=True)

        # First, try to discover real category IDs from the API
        real_categories = await self._discover_categories(client)
        categories_to_use = real_categories if real_categories else FOOD_CATEGORIES

        print(
            f"[{self.CHAIN_NAME}] Categories found: {len(categories_to_use)}",
            flush=True,
        )

        tasks = [
            self._scrape_category(
                client, semaphore, cat_id, cat_name, ingest_async, is_scraped_async
            )
            for cat_id, cat_name in categories_to_use
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _discover_categories(self, client) -> list:
        """Try to fetch real category list from the Rukavychka API."""
        try:
            resp = await client.fetch(f"{API_BASE}/categories/", headers=API_HEADERS)
            if not resp or resp.status_code != 200:
                # Try alternative endpoint
                resp = await client.fetch(
                    f"{BASE_URL}/categories.json", headers=API_HEADERS
                )
            if resp and resp.status_code == 200:
                data = resp.json()
                categories = []
                items = (
                    data
                    if isinstance(data, list)
                    else data.get("categories") or data.get("items") or []
                )
                for item in items:
                    cid = item.get("id") or item.get("category_id")
                    name = item.get("name") or item.get("title") or ""
                    # Skip non-food
                    if any(
                        kw in name.lower()
                        for kw in [
                            "хімія",
                            "гігієн",
                            "космет",
                            "тварин",
                            "тютюн",
                            "алкоголь",
                        ]
                    ):
                        continue
                    if cid and name:
                        categories.append((cid, name))
                if categories:
                    return categories
        except Exception as e:
            logger.warning(f"[{self.CHAIN_NAME}] Category discovery failed: {e}")
        return []

    async def _scrape_category(
        self, client, semaphore, cat_id, cat_name, ingest_async, is_scraped_async
    ):
        if await is_scraped_async(self.CHAIN_SLUG, 0, cat_name, 12):
            print(
                f"[{self.CHAIN_NAME}] SKIP: '{cat_name}' (already scraped recently)",
                flush=True,
            )
            return

        print(f"[{self.CHAIN_NAME}] START: '{cat_name}' (id={cat_id})", flush=True)
        async with semaphore:
            products = []
            page = 1
            while page <= MAX_PAGES_PER_CATEGORY:
                page_products, has_more = await self._fetch_page(
                    client, cat_id, cat_name, page
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
        else:
            print(f"[{self.CHAIN_NAME}] No products for '{cat_name}'", flush=True)

    async def _fetch_page(self, client, cat_id, cat_name, page):
        """Try multiple API endpoint patterns for Rukavychka."""
        # Try JSON API first
        endpoints = [
            f"{API_BASE}/products/?category_id={cat_id}&page={page}&per_page={PER_PAGE}",
            f"{BASE_URL}/catalog/{cat_id}/?page={page}&format=json",
            f"{API_BASE}/catalog/products/?category={cat_id}&page={page}&limit={PER_PAGE}",
        ]

        for url in endpoints:
            resp = await client.fetch(url, headers=API_HEADERS)
            if resp and resp.status_code == 200:
                try:
                    data = resp.json()
                    results = (
                        data.get("products")
                        or data.get("items")
                        or data.get("results")
                        or (data if isinstance(data, list) else [])
                    )
                    if results:
                        products = []
                        for item in results:
                            p = self._parse_item(item, cat_name)
                            if p:
                                products.append(p)

                        total = data.get("total") or data.get("count") or len(results)
                        has_more = (
                            page * PER_PAGE < int(total)
                            if total
                            else len(results) == PER_PAGE
                        )
                        return products, has_more
                except Exception as e:
                    logger.debug(f"[{self.CHAIN_NAME}] JSON parse error {url}: {e}")
                    continue

        return [], False

    def _parse_item(self, item: dict, cat_name: str) -> dict | None:
        pid = (
            item.get("id")
            or item.get("product_id")
            or item.get("sku")
            or item.get("article")
        )
        if not pid:
            return None

        title = item.get("name") or item.get("title") or item.get("product_name") or ""
        if not title:
            return None

        price_raw = (
            item.get("price")
            or item.get("current_price")
            or item.get("sell_price")
            or 0
        )
        try:
            price = float(price_raw)
            # Rukavychka sometimes returns price in kopecks
            if price > 10000:
                price = price / 100
        except (TypeError, ValueError):
            return None
        if price <= 0:
            return None

        old_price_raw = (
            item.get("old_price") or item.get("price_old") or item.get("original_price")
        )
        try:
            old_price = float(old_price_raw)
            if old_price > 10000:
                old_price = old_price / 100
        except (TypeError, ValueError):
            old_price = None

        image_url = (
            item.get("image")
            or item.get("image_url")
            or item.get("photo")
            or item.get("img")
            or ""
        )
        if image_url and not image_url.startswith("http"):
            image_url = f"{BASE_URL}{image_url}"

        product_url = item.get("url") or item.get("link") or item.get("href") or ""
        if product_url and not product_url.startswith("http"):
            product_url = f"{BASE_URL}{product_url}"

        weight = (
            item.get("weight") or item.get("unit_value") or item.get("quantity") or ""
        )

        return {
            "external_store_id": str(pid),
            "title": str(title),
            "image_url": image_url,
            "url": product_url,
            "price": price,
            "old_price": old_price,
            "description": str(weight),
            "category": cat_name,
            "is_sale": old_price is not None and old_price > price,
            "in_stock": item.get("in_stock", item.get("available", True)),
        }
