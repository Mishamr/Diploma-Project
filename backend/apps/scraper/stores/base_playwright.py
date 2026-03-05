"""
Playwright-based async scraper transport.

Замінює curl_cffi транспорт з base.py на playwright-asyncio з паралельним
виконанням через пул із 5 browser instances.

Оригінальні методи _parse_products() та _has_next_page() НЕ ЗМІНЮЮТЬСЯ —
вони викликаються як є з підкласів (напр. ATBScraper).
"""

import asyncio
import json
import os
import random
import time
import logging
from abc import abstractmethod
from typing import Optional

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, Browser, BrowserContext

logger = logging.getLogger(__name__)

# ─── Рандомні User-Agents ───
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0",
]

# ─── Директорії ───
DB_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
JSONL_DIR = os.path.join(DB_DIR, 'jsonl')


class PlaywrightStoreScraper:
    """
    Асинхронний базовий клас для скреперів на Playwright.

    Особливості:
      - Пул із 5 browser instances (Semaphore)
      - Всі категорії запускаються ПАРАЛЕЛЬНО через asyncio.gather()
      - JSONL backup (дозапис для crash-safety)
      - Чистий консольний вивід без спаму
      - Запис у SQLite (3 таблиці: all/sale/regular)
    """

    CHAIN_NAME: str = ''
    CHAIN_SLUG: str = ''
    BASE_URL: str = ''
    CATALOG_CATEGORIES: list[str] = []
    ITEM_SELECTOR: str = ''
    MAX_PAGES: int = 100
    HEADERS: dict = {}

    # Паралельність
    MAX_WORKERS: int = 5
    MAX_RETRIES: int = 3

    def __init__(self, shop_id: str = "1"):
        self.shop_id = shop_id
        self._seen_ids: set = set()
        self._jsonl_lock = asyncio.Lock()
        self._jsonl_path: str = ""
        self._products_queue = []
        self._stats: dict = {}

    # ─── SQLite setup ───

    def _setup_database(self):
        pass

    def _setup_jsonl(self):
        os.makedirs(JSONL_DIR, exist_ok=True)
        ts = time.strftime('%Y%m%d_%H%M%S')
        self._jsonl_path = os.path.join(JSONL_DIR, f'{self.CHAIN_SLUG}_{ts}.jsonl')

    # ─── Головний метод ───

    def scrape(self):
        """Синхронна обгортка для запуску з Celery."""
        asyncio.run(self.scrape_async())

    async def scrape_async(self):
        """Головний async метод: пул браузерів + паралельні категорії."""
        self._setup_database()
        self._setup_jsonl()

        total_cats = len(self.CATALOG_CATEGORIES)
        start_time = time.time()

        print(f"\n{'═'*60}")
        print(f"  🛒 {self.CHAIN_NAME} — Початок збору ({total_cats} категорій)")
        print(f"  🔧 Воркерів: {self.MAX_WORKERS} | Retry: {self.MAX_RETRIES}")
        print(f"{'═'*60}\n")

        semaphore = asyncio.Semaphore(self.MAX_WORKERS)

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)

            tasks = [
                self._scrape_category_async(browser, semaphore, path, idx, total_cats)
                for idx, path in enumerate(self.CATALOG_CATEGORIES, 1)
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            await browser.close()

        # Підсумки
        elapsed = time.time() - start_time
        total_products = len(self._seen_ids)
        ok_cats = sum(1 for r in results if not isinstance(r, Exception))
        fail_cats = sum(1 for r in results if isinstance(r, Exception))

        print(f"\n{'═'*60}")
        print(f"  ✅ {self.CHAIN_NAME} — ЗАВЕРШЕНО")
        print(f"  📦 Товарів: {total_products}")
        print(f"  📂 Категорій: {ok_cats} ✓ / {fail_cats} ✗")
        print(f"  ⏱  Час: {elapsed:.1f}s")
        print(f"  💾 JSONL: {self._jsonl_path}")
        print(f"{'═'*60}\n")

        # Ingest into Django DB
        if self._products_queue:
            from apps.scraper.services import ingest_scraped_data
            from asgiref.sync import sync_to_async
            print(f"  📥 Ingesting {len(self._products_queue)} products into database...")
            try:
                shop_id_int = int(self.shop_id.strip())
            except ValueError:
                shop_id_int = 1
            await sync_to_async(ingest_scraped_data)(self._products_queue, self.CHAIN_SLUG, shop_id_int)

        self.close()

    # ─── Scraping однієї категорії ───

    async def _scrape_category_async(
        self, browser: Browser, semaphore: asyncio.Semaphore,
        path: str, cat_idx: int, total_cats: int
    ):
        async with semaphore:
            ua = random.choice(USER_AGENTS)
            context = await browser.new_context(user_agent=ua)
            page = await context.new_page()

            cat_start = time.time()
            cat_products = 0
            pages_scraped = 0

            try:
                for page_num in range(1, self.MAX_PAGES + 1):
                    url = f"{self.BASE_URL}{path}?page={page_num}"
                    html = await self._fetch_with_retry(page, url)

                    if html is None:
                        break

                    products = self._parse_products(html)
                    if not products:
                        break

                    # Дедублікація + збереження
                    saved = 0
                    for p in products:
                        pid = p["external_store_id"]
                        if pid not in self._seen_ids:
                            self._seen_ids.add(pid)
                            await self._save_product_async(p)
                            saved += 1

                    cat_products += saved
                    pages_scraped += 1

                    # Перевірка пагінації
                    soup = BeautifulSoup(html, 'lxml')
                    if not self._has_next_page(soup, page_num):
                        break

                    # Рандомна затримка між сторінками
                    await asyncio.sleep(random.uniform(0.5, 1.5))

            except Exception as e:
                cat_name = path.split('/')[-1][:25]
                print(f"  [{cat_idx:3}/{total_cats}] ✗ {cat_name} — помилка: {e}")
                raise
            finally:
                await context.close()

            # Чистий однолінійний вивід
            cat_time = time.time() - cat_start
            cat_name = path.split('/')[-1][:30]
            print(f"  [{cat_idx:3}/{total_cats}] ✓ {cat_name:<30} {cat_products:4} тов. ({pages_scraped} стор.) {cat_time:.1f}s")

            return cat_products

    # ─── Fetch з retry ───

    async def _fetch_with_retry(self, page, url: str, retries: int = 0) -> Optional[str]:
        try:
            response = await page.goto(url, wait_until='domcontentloaded', timeout=15000)
            if response is None or response.status != 200:
                if retries < self.MAX_RETRIES:
                    await asyncio.sleep(1)
                    return await self._fetch_with_retry(page, url, retries + 1)
                return None
            return await page.content()
        except Exception:
            if retries < self.MAX_RETRIES:
                await asyncio.sleep(1 + retries)
                return await self._fetch_with_retry(page, url, retries + 1)
            return None

    # ─── Збереження ───

    async def _save_product_async(self, product: dict):
        """Зберігає товар у JSONL + додає до черги."""
        # JSONL (append, crash-safe)
        async with self._jsonl_lock:
            with open(self._jsonl_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(product, ensure_ascii=False) + '\n')
        
        self._products_queue.append(product)

    # ─── Абстрактні методи (реалізуються в підкласах) ───

    @abstractmethod
    def _parse_products(self, html: str) -> list[dict]:
        pass

    def _has_next_page(self, soup: BeautifulSoup, current_page: int) -> bool:
        next_links = soup.select(f"a[href*='page={current_page + 1}']")
        return len(next_links) > 0

    # ─── Закриття ───

    def close(self):
        pass
