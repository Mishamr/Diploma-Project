import asyncio
import logging
from asgiref.sync import async_to_sync

from apps.scraper.services import ingest_scraped_data
from .factory import register
from .client import UniversalScraperClient

logger = logging.getLogger(__name__)

BASE_URL = "https://sf-ecom-api.silpo.ua"
PRODUCTS_ENDPOINT = "/v1/uk/branches/{branch_id}/products"
PER_PAGE = 30  # limit per request

# Categories are now fetched dynamically from the API

# ─── Concurrency settings ───
MAX_CONCURRENT_CATEGORIES = 1
MAX_CONCURRENT_PAGES = 1
MAX_PAGES_PER_CATEGORY = 30

# Default headers for Silpo API
API_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
    "Origin": "https://silpo.ua",
    "Referer": "https://silpo.ua/",
}


@register('silpo')
class SilpoScraper:
    CHAIN_NAME = 'Сільпо'
    CHAIN_SLUG = 'silpo'

    # Default UUID works without selecting a specific branch.
    # To get a real branch UUID: open silpo.ua → select your store →
    # check Network tab for /v1/uk/branches/<UUID>/products and copy that UUID.
    DEFAULT_BRANCH_ID = "1edb6b13-defd-6bb8-a1c4-87d073549907"

    def __init__(self, shop_id: str = "00000000-0000-0000-0000-000000000000"):
        self.shop_id = shop_id
        if len(str(shop_id)) < 30:
            self.branch_id = self.DEFAULT_BRANCH_ID
        else:
            self.branch_id = shop_id or self.DEFAULT_BRANCH_ID
        self.dynamic_categories = []

    def close(self):
        pass

    def start(self):
        self.scrape()

    def scrape(self):
        all_products = async_to_sync(self._run)()

        if not all_products:
            print(f"[{self.CHAIN_NAME}] Немає товарів для збереження.")
            return

        print(f"[{self.CHAIN_NAME}] Зберігаю {len(all_products)} товарів у БД...")
        try:
            shop_id_int = int(str(self.shop_id).strip())
        except ValueError:
            shop_id_int = 1
            
        ingest_scraped_data(all_products, self.CHAIN_SLUG, shop_id_int)
        print(f"[{self.CHAIN_NAME}] ✓ Збережено!")

    async def _run(self):
        all_products = []
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_CATEGORIES)
        
        client = UniversalScraperClient(
            max_concurrent_requests=2,
            min_jitter=1.0,
            max_jitter=3.0,
            max_retries=3,
        )

        print(f"[{self.CHAIN_NAME}] Отримання динамічних категорій...")
        categories_url = BASE_URL + f"/v1/uk/branches/{self.branch_id}/categories"
        cat_resp = await client.fetch(categories_url, headers=API_HEADERS)
        if cat_resp and cat_resp.status_code == 200:
            cat_data = cat_resp.json()
            for item in cat_data.get("items", []):
                if item.get("parentId") is None:
                    self.dynamic_categories.append({
                        "slug": item.get("slug"),
                        "title": item.get("title")
                    })

        print(f"[{self.CHAIN_NAME}] Початок збору даних (async). Магазин ID: {self.shop_id}")
        print(f"[{self.CHAIN_NAME}] Знайдено кореневих категорій: {len(self.dynamic_categories)} | Паралельно: {MAX_CONCURRENT_CATEGORIES}")

        tasks = [
            self._scrape_category(client, semaphore, cat["slug"], cat["title"])
            for cat in self.dynamic_categories
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for r in results:
            if isinstance(r, list):
                all_products.extend(r)
            elif isinstance(r, Exception):
                print(f"[{self.CHAIN_NAME}] Category error Exception: {r}")

        # Deduplicate by external_store_id
        seen = set()
        unique = []
        for p in all_products:
            key = p.get('external_store_id')
            if key and key not in seen:
                seen.add(key)
                unique.append(p)

        print(f"\n[{self.CHAIN_NAME}] Зібрано унікальних товарів: {len(unique)}")
        return unique

    async def _scrape_category(self, client: UniversalScraperClient, semaphore: asyncio.Semaphore, slug: str, category_name: str) -> list:
        async with semaphore:
            products = []

            page1_products, total_pages = await self._fetch_page(client, slug, 1, category_name)
            products.extend(page1_products)

            if not page1_products:
                return products

            print(f"  ✓ {slug} [{category_name}] — стор.1: {len(page1_products)} товарів (всього сторінок: {total_pages})")

            if total_pages > 1:
                page_sem = asyncio.Semaphore(MAX_CONCURRENT_PAGES)
                last_page = min(total_pages, MAX_PAGES_PER_CATEGORY)
                page_tasks = [
                    self._fetch_page_limited(client, page_sem, slug, p, category_name)
                    for p in range(2, last_page + 1)
                ]
                page_results = await asyncio.gather(*page_tasks, return_exceptions=True)

                for r in page_results:
                    if isinstance(r, tuple):
                        page_products, _ = r
                        products.extend(page_products)
                    elif isinstance(r, Exception):
                        print(f"[{self.CHAIN_NAME}] Page error in {slug}: {r}")

            return products

    async def _fetch_page_limited(self, client, semaphore, slug, page, category_name):
        async with semaphore:
            return await self._fetch_page(client, slug, page, category_name)

    async def _fetch_page(self, client: UniversalScraperClient, slug: str, page: int, category_name: str):
        """
        Fetch one page from Silpo JSON API (offset-based pagination) via Smart Client.
        Returns (products: list, total_pages: int).
        """
        url = BASE_URL + PRODUCTS_ENDPOINT.format(branch_id=self.branch_id)
        offset = (page - 1) * PER_PAGE
        params = {
            "limit": PER_PAGE,
            "offset": offset,
            "category": slug,
            "deliveryType": "DeliveryHome",
            "includeChildCategories": "true",
            "inStock": "true",
        }

        response = await client.fetch(url, params=params, headers=API_HEADERS)
        
        if not response:
            print(f"[Silpo Debug] Без відповіді для {slug} стор {page}")
            return [], 0
            
        if response.status_code != 200:
            print(f"[Silpo Debug] Помилка {response.status_code} для {slug}: {response.text[:200]}")
            return [], 0

        try:
            data = response.json()

            # Silpo API returns: { "items": [...], "total": 150 }
            items = data.get("items") or data.get("products") or data.get("data") or []
            total_items = (
                data.get("total")
                or data.get("totalItems")
                or data.get("count")
                or (data.get("meta") or {}).get("total")
                or len(items)
            )
            total_pages = (total_items + PER_PAGE - 1) // PER_PAGE if total_items else 1

            if not items:
                print(f"[Silpo Debug] 200 OK, але немає 'items'. Ключі JSON: {list(data.keys())[:10]}")
                return [], 0

            products = []
            for item in items:
                product = self._parse_item(item, category_name)
                if product:
                    products.append(product)

            return products, int(total_pages)

        except Exception as e:
            print(f"[Silpo Debug] Error parsing Silpo JSON for {slug} page {page}: {e}")
            return [], 0

    def _parse_item(self, item: dict, category_name: str = '') -> dict | None:
        """Parse a single product dict from Silpo API."""
        # ── ID — використовуємо externalProductId (стабільний int) ──────────
        product_id = item.get("externalProductId") or item.get("id")
        if not product_id:
            return None

        # ── Назва ───────────────────────────────────────────────────────────
        title = item.get("title") or "Unknown"

        # ── Ціна ────────────────────────────────────────────────────────────
        price_raw = item.get("displayPrice") or item.get("price") or 0
        try:
            price_val = float(price_raw)
        except (ValueError, TypeError):
            price_val = 0.0

        if price_val <= 0:
            return None

        old_price_raw = item.get("displayOldPrice") or item.get("oldPrice")
        try:
            old_price_val = float(old_price_raw) if old_price_raw is not None else None
        except (ValueError, TypeError):
            old_price_val = None

        # ── Зображення ──────────────────────────────────────────────────────
        icon = item.get("icon") or ""
        if icon and not icon.startswith("http"):
            image_url = f"https://content.silpo.ua/tera/large/webp/{icon}"
        else:
            image_url = icon

        # ── Опис = одиниця виміру / вага порції ─────────────────────────────
        description = item.get("displayRatio") or item.get("ratio") or ""

        # ── Наявність: stock > 0 ────────────────────────────────────────────
        stock = item.get("stock", 0)
        try:
            in_stock = float(stock) > 0
        except (ValueError, TypeError):
            in_stock = True

        return {
            "external_store_id": str(product_id),
            "title": str(title),
            "image_url": image_url,
            "price": price_val,
            "old_price": old_price_val,
            "description": str(description),
            "category": category_name,
            "is_sale": old_price_val is not None and old_price_val > price_val,
            "in_stock": in_stock,
        }
