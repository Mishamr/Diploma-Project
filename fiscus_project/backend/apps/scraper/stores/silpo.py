import asyncio
import logging

from apps.scraper.services import ingest_scraped_data
from asgiref.sync import async_to_sync

from .client import UniversalScraperClient
from .factory import register

logger = logging.getLogger(__name__)

BASE_URL = "https://sf-ecom-api.silpo.ua"
PRODUCTS_ENDPOINT = "/v1/uk/branches/{branch_id}/products"
PER_PAGE = 30  # limit per request

# Categories are now fetched dynamically from the API

# ─── Concurrency settings ───
MAX_CONCURRENT_CATEGORIES = 3
MAX_CONCURRENT_PAGES = 3
MAX_PAGES_PER_CATEGORY = 30

# Default headers for Silpo API
API_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
    "Origin": "https://silpo.ua",
    "Referer": "https://silpo.ua/",
}

# Non-food category slugs to EXCLUDE from scraping
NON_FOOD_SLUGS = {
    "pobutova-khimiia",
    "pobut-khimiia",
    "khimiya",
    "cleaning",
    "hihiiena",
    "hihiena",
    "hygiene",
    "kosmetyka",
    "cosmetics",
    "tovary-dlia-domu",
    "dom",
    "household",
    "tovary-dlia-tvaryn",
    "tvaryny",
    "pets",
    "pet",
    "kantseliariia",
    "kantseliariya",
    "stationery",
    "tiutiunovi-vyroby",
    "tiutiun",
    "tobacco",
    "alkohol",
    "alcohol",
    "vyno",
    "pyvo",
    "horilka",
    "apteka",
    "pharmacy",
    "medykamenty",
    "dytiacha-hihiiena",
    "pidguzky",
    "odezhda",
    "vzuttia",
    "clothing",
    "shoes",
    "elektronika",
    "tekhnika",
    "electronics",
    "igrashky",
    "toys",
}


@register("silpo")
class SilpoScraper:
    CHAIN_NAME = "Сільпо"
    CHAIN_SLUG = "silpo"

    # Default UUID works without selecting a specific branch.
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
        try:
            shop_id_int = int("".join(filter(str.isdigit, str(self.shop_id))) or "1")
        except ValueError:
            shop_id_int = 1

        async_to_sync(self._run)(shop_id_int)
        print(f"[{self.CHAIN_NAME}] ✓ Парсинг завершено!")

    async def _run(self, shop_id_int: int):
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_CATEGORIES)

        client = UniversalScraperClient(
            max_concurrent_requests=5,
            min_jitter=1.0,
            max_jitter=2.5,
            max_retries=3,
        )

        print(f"[{self.CHAIN_NAME}] Отримання динамічних категорій...", flush=True)
        categories_url = BASE_URL + f"/v1/uk/branches/{self.branch_id}/categories"
        cat_resp = await client.fetch(categories_url, headers=API_HEADERS)

        if not cat_resp or cat_resp.status_code != 200:
            print(f"[{self.CHAIN_NAME}] [!] Не вдалося отримати категорії.")
            return

        cat_data = cat_resp.json()
        for item in cat_data.get("items", []):
            # parentId can be None OR 0 — both mean top-level category
            parent_id = item.get("parentId")
            if parent_id is not None and parent_id != 0:
                continue
            slug = item.get("slug", "")
            # Skip non-food categories
            if slug in NON_FOOD_SLUGS:
                continue
            # Also skip by partial match for safety
            slug_lower = slug.lower()
            if any(
                kw in slug_lower
                for kw in [
                    "khimi",
                    "higien",
                    "kosmet",
                    "tvary",
                    "tobacco",
                    "tiutiun",
                    "kancel",
                    "aptek",
                    "pharm",
                    "elektron",
                    "tekhn",
                    "vzutt",
                    "odezh",
                    "igras",
                    "alkoh",
                    "pidguz",
                ]
            ):
                continue
            self.dynamic_categories.append({"slug": slug, "title": item.get("title")})

        print(
            f"[{self.CHAIN_NAME}] Початок збору даних (async). Магазин ID: {self.shop_id}",
            flush=True,
        )
        print(
            f"[{self.CHAIN_NAME}] Знайдено кореневих категорій: {len(self.dynamic_categories)} | Паралельно: {MAX_CONCURRENT_CATEGORIES}",
            flush=True,
        )

        from apps.scraper.services import is_category_scraped
        from asgiref.sync import sync_to_async

        is_scraped_async = sync_to_async(is_category_scraped)
        ingest_async = sync_to_async(ingest_scraped_data)

        tasks = [
            self._scrape_and_ingest_category(
                client,
                semaphore,
                cat["slug"],
                cat["title"],
                shop_id_int,
                is_scraped_async,
                ingest_async,
            )
            for cat in self.dynamic_categories
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _scrape_and_ingest_category(
        self,
        client,
        semaphore,
        slug,
        category_name,
        shop_id_int,
        is_scraped_async,
        ingest_async,
    ):
        if await is_scraped_async(
            self.CHAIN_SLUG, shop_id_int, category_name, hours=12
        ):
            print(
                f"[{self.CHAIN_NAME}] ПРОПУСК: категорія '{category_name}' (вже оновлена нещодавно).",
                flush=True,
            )
            return

        print(
            f"[{self.CHAIN_NAME}] СТАРТ: Збираємо категорію '{category_name}'...",
            flush=True,
        )
        products = await self._scrape_category(client, semaphore, slug, category_name)

        if products:
            # Deduplicate by external_store_id
            seen = set()
            unique = []
            for p in products:
                key = p.get("external_store_id")
                if key and key not in seen:
                    seen.add(key)
                    unique.append(p)

            print(
                f"[{self.CHAIN_NAME}] ЗБЕРЕЖЕННЯ: {len(unique)} товарів для категорії '{category_name}'...",
                flush=True,
            )
            await ingest_async(unique, self.CHAIN_SLUG, shop_id_int)

    async def _scrape_category(
        self,
        client: UniversalScraperClient,
        semaphore: asyncio.Semaphore,
        slug: str,
        category_name: str,
    ) -> list:
        async with semaphore:
            products = []

            page1_products, total_pages = await self._fetch_page(
                client, slug, 1, category_name
            )
            products.extend(page1_products)

            if not page1_products:
                return products

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

    async def _fetch_page(
        self, client: UniversalScraperClient, slug: str, page: int, category_name: str
    ):
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

        if not response or response.status_code != 200:
            return [], 0

        try:
            data = response.json()
            items = data.get("items") or data.get("products") or data.get("data") or []

            if not items:
                return [], 0

            total_items = (
                data.get("total")
                or data.get("totalItems")
                or data.get("count")
                or (data.get("meta") or {}).get("total")
                or len(items)
            )
            total_pages = (total_items + PER_PAGE - 1) // PER_PAGE if total_items else 1

            products = []
            for item in items:
                product = self._parse_item(item, category_name)
                if product:
                    products.append(product)

            return products, int(total_pages)

        except Exception as e:
            print(
                f"[{self.CHAIN_NAME}] Error parsing Silpo JSON for {slug} page {page}: {e}"
            )
            return [], 0

    def _parse_item(self, item: dict, category_name: str = "") -> dict | None:
        """Parse a single product dict from Silpo API."""
        product_id = item.get("externalProductId") or item.get("id")
        if not product_id:
            return None

        title = item.get("title") or "Unknown"

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

        icon = item.get("icon") or ""
        if icon:
            if not icon.startswith("http"):
                # If icon already has an extension, use it. Otherwise, Silpo CDN prefers webp.
                has_ext = any(
                    icon.endswith(ext) for ext in [".webp", ".jpg", ".png", ".jpeg"]
                )
                img_path = icon if has_ext else f"{icon}.webp"
                image_url = f"https://content.silpo.ua/tera/large/webp/{img_path}"
            else:
                image_url = icon
        else:
            image_url = ""

        # Fallback for old icon field if image_url still empty
        if not image_url:
            image_url = item.get("imageUrl") or ""

        description = item.get("displayRatio") or item.get("ratio") or ""

        stock = item.get("stock", 0)
        try:
            in_stock = float(stock) > 0
        except (ValueError, TypeError):
            in_stock = True

        # ── Product URL ─────────────────────────────────────────────────────
        slug = item.get("slug")
        url = f"https://silpo.ua/products/{slug}" if slug else ""

        return {
            "external_store_id": str(product_id),
            "title": str(title),
            "image_url": image_url,
            "url": url,
            "price": price_val,
            "old_price": old_price_val,
            "description": str(description),
            "category": category_name,
            "is_sale": old_price_val is not None and old_price_val > price_val,
            "in_stock": in_stock,
        }
