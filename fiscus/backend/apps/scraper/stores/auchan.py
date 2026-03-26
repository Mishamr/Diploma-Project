"""
Auchan Ukraine scraper — auchan.ua
Adapted from standalone BS4 scraper to the Fiscus factory pattern.

Auchan.ua is a Next.js SSR site — all product data is in the HTML response.
Uses UniversalScraperClient (async, anti-ban) instead of raw requests.

Usage via factory:
    scraper = ScraperFactory.get_scraper('auchan')
    scraper.scrape()
    scraper.close()
"""

import asyncio
import logging
import re

from apps.scraper.services import ingest_scraped_data
from asgiref.sync import async_to_sync
from bs4 import BeautifulSoup

from .client import UniversalScraperClient
from .factory import register

logger = logging.getLogger(__name__)

BASE_URL = "https://auchan.ua"

# ─── Category URL → human-readable name mapping ───
CATEGORY_MAP = {
    "/ua/shokolad/": "Шоколад",
    "/ua/batonchiki/": "Батончики",
    "/ua/konfety/": "Цукерки",
    "/ua/pechen-e/": "Печиво та вафлі",
    "/ua/kofe/": "Кава",
    "/ua/chaj/": "Чай",
    "/ua/moloko/": "Молоко",
    "/ua/sir/": "Сир",
    "/ua/maslo-margaryn-spred/": "Масло та маргарин",
    "/ua/jajcja/": "Яйця",
    "/ua/khleb-vypechka/": "Хліб та випічка",
    "/ua/krupy/": "Крупи",
    "/ua/makaronnye-izdelija/": "Макарони",
    "/ua/myaso/": "М'ясо",
    "/ua/ryba/": "Риба",
    "/ua/voda/": "Вода",
    "/ua/soki-nektary/": "Соки та нектари",
    "/ua/chipsy-sneki-sukhariki/": "Чіпси та снеки",
    "/ua/zamorozhennye-produkty/": "Заморожені продукти",
    "/ua/kolbasnye-izdelija/": "Ковбасні вироби",
}

CATALOG_CATEGORIES = list(CATEGORY_MAP.keys())

# ─── Concurrency settings ───
MAX_CONCURRENT_CATEGORIES = 3
MAX_PAGES_PER_CATEGORY = 5


# ─── Helpers ───


def _parse_price(text: str):
    """Extract float price from text like '49,90 ₴'."""
    if not text:
        return None
    cleaned = re.sub(r"[^\d,.]", "", text).replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _page_url(category_path: str, page: int) -> str:
    """Build paginated URL: page=1 → original; page=2 → /l/page-2/ suffix."""
    url = f"{BASE_URL}{category_path}".rstrip("/")
    if page == 1:
        return url + "/"
    return f"{url}/l/page-{page}/"


# ─── HTML Parsers ───


def _extract_total_pages(html: str) -> int:
    """Find the highest page number in pagination links."""
    soup = BeautifulSoup(html, "html.parser")
    nums = []
    for a in soup.select("a.pagination_tile__gZcwx"):
        try:
            nums.append(int(a.get_text(strip=True)))
        except ValueError:
            pass
    return max(nums, default=1)


def _extract_category_name(html: str, fallback: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.select_one("h1.page-title")
    return h1.get_text(strip=True) if h1 else fallback


def _parse_products_from_html(html: str, category_name: str) -> list[dict]:
    """
    Parse product data from Auchan HTML page.
    Tries ld+json ProductCollection first, then falls back to card scraping.
    Returns list of dicts in Fiscus ingest format.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Build price lookup from HTML cards
    card_prices = {}
    for card in soup.select("div.ProductCard_root__XrdQ7"):
        link = card.select_one("a.ProductCard_data__name__KS_Lq")
        if not link:
            continue
        href = link.get("href", "")
        url = BASE_URL + href if href.startswith("/") else href

        actual_el = card.select_one(
            "span.ProductFooterActions_price_value_actual__OJfRq"
        )
        old_el = card.select_one("span.ProductFooterActions_price_value_old__AlzSM")
        actual = _parse_price(actual_el.get_text(strip=True)) if actual_el else None
        old = _parse_price(old_el.get_text(strip=True)) if old_el else None
        card_prices[url] = (actual, old)

    products = []

    # Scrape cards directly
    for card in soup.select("div.ProductCard_root__XrdQ7"):
        link = card.select_one("a.ProductCard_data__name__KS_Lq")
        if not link:
            continue
        href = link.get("href", "")
        url = BASE_URL + href if href.startswith("/") else href
        actual, old = card_prices.get(url, (None, None))
        if not actual or actual <= 0:
            continue

        img_el = card.select_one("div.ProductImage_photo__FOicA img")
        slug = href.rstrip("/").split("/")[-1] if href else ""

        products.append(
            {
                "external_store_id": slug,
                "title": link.get_text(strip=True),
                "price": actual,
                "old_price": old,
                "image_url": img_el["src"] if img_el and img_el.get("src") else "",
                "url": url,
                "description": "",
                "category": category_name,
                "is_sale": old is not None and old > actual,
                "in_stock": True,
            }
        )

    return products


# ─── Scraper Class ───


@register("auchan")
class AuchanScraper:
    CHAIN_NAME = "Ашан"
    CHAIN_SLUG = "auchan"

    def __init__(self, shop_id: str = "1"):
        self.shop_id = shop_id

    def close(self):
        """Called by main.py after scraping — no-op since session is managed async."""
        pass

    def start(self):
        self.scrape()

    def scrape(self):
        """Sync entry-point — runs async runner."""
        try:
            shop_id_int = int(str(self.shop_id).strip())
        except ValueError:
            shop_id_int = 1

        async_to_sync(self._run)(shop_id_int)
        print(f"[{self.CHAIN_NAME}] ✓ Парсинг завершено!")

    async def _run(self, shop_id_int: int):
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_CATEGORIES)

        client = UniversalScraperClient(
            max_concurrent_requests=10,
            min_jitter=0.5,
            max_jitter=1.5,
            max_retries=3,
        )

        print(
            f"[{self.CHAIN_NAME}] Початок збору даних (async). Магазин ID: {self.shop_id}",
            flush=True,
        )
        print(
            f"[{self.CHAIN_NAME}] Категорій: {len(CATALOG_CATEGORIES)} | Паралельно: {MAX_CONCURRENT_CATEGORIES}",
            flush=True,
        )

        from apps.scraper.services import is_category_scraped
        from asgiref.sync import sync_to_async

        is_scraped_async = sync_to_async(is_category_scraped)
        ingest_async = sync_to_async(ingest_scraped_data)

        tasks = [
            self._scrape_and_ingest_category(
                client, semaphore, cat_path, shop_id_int, is_scraped_async, ingest_async
            )
            for cat_path in CATALOG_CATEGORIES
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _scrape_and_ingest_category(
        self,
        client,
        semaphore,
        category_path,
        shop_id_int,
        is_scraped_async,
        ingest_async,
    ):
        category_name = CATEGORY_MAP.get(
            category_path, category_path.strip("/").split("/")[-1]
        )

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
        products = await self._scrape_category(client, semaphore, category_path)

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

    async def _scrape_category(self, client, semaphore, category_path):
        """Scrape all pages of a category."""
        async with semaphore:
            category_name = CATEGORY_MAP.get(
                category_path, category_path.strip("/").split("/")[-1]
            )
            products = []

            # Fetch page 1
            url = _page_url(category_path, 1)
            response = await client.fetch(url)
            if not response or response.status_code != 200:
                logger.warning(
                    f"[{self.CHAIN_NAME}] Failed to fetch {url}: {response.status_code if response else 'None'}"
                )
                return products

            html = response.text
            # Try to get actual category name from page
            page_cat_name = _extract_category_name(html, category_name)
            total_pages = min(_extract_total_pages(html), MAX_PAGES_PER_CATEGORY)

            page1_products = _parse_products_from_html(html, page_cat_name)
            products.extend(page1_products)

            # Fetch remaining pages
            for page in range(2, total_pages + 1):
                url = _page_url(category_path, page)
                resp = await client.fetch(url)
                if not resp or resp.status_code != 200:
                    break
                found = _parse_products_from_html(resp.text, page_cat_name)
                if not found:
                    break
                products.extend(found)

            return products
