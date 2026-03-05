"""
Base scraper — curl_cffi + BeautifulSoup architecture.

Кожний скрепер наслідує BaseStoreScraper і перевизначає:
  - CHAIN_NAME, CHAIN_SLUG, BASE_URL
  - CATALOG_CATEGORIES   — список шляхів каталогу (відносно BASE_URL)
  - ITEM_SELECTOR        — CSS-селектор контейнера товару
  - HEADERS              — HTTP-заголовки
  - MAX_PAGES            — ліміт пагінації (за замовчуванням 100)
  - _parse_products(html) — парсинг HTML-сторінки → список товарів
  - _has_next_page(soup, page_num) — перевірка наступної сторінки
"""

import time
import random
import logging
import sqlite3
import os
from abc import ABC, abstractmethod
from typing import Optional

from curl_cffi import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ─── Директорія для SQLite баз ───
DB_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data')


class BaseStoreScraper(ABC):
    """
    Базовий клас для всіх скреперів.

    Зберігає товари в одну SQLite базу з 3 таблицями:
      - all_products     — всі товари
      - sale_products    — товари зі знижкою
      - regular_products — товари без знижки

    Поля: product_id, title, image_url, price, old_price, description
    """

    CHAIN_NAME: str = ''
    CHAIN_SLUG: str = ''
    BASE_URL: str = ''

    # Шляхи категорій каталогу (відносно BASE_URL)
    CATALOG_CATEGORIES: list[str] = []

    # CSS-селектор контейнера одного товару
    ITEM_SELECTOR: str = ''

    # Максимальна кількість сторінок пагінації
    MAX_PAGES: int = 100

    # HTTP-заголовки
    HEADERS: dict = {}

    # curl_cffi impersonate target
    IMPERSONATE: str = "chrome110"

    def __init__(self, shop_id: str = "1"):
        self.shop_id = shop_id
        self.conn: Optional[sqlite3.Connection] = None
        self._seen_ids: set = set()

    # ─── Ініціалізація бази даних ───

    def setup_database(self):
        """Створює одну SQLite базу з 3 таблицями. Очищує таблиці при кожному запуску."""
        os.makedirs(DB_DIR, exist_ok=True)

        db_path = os.path.join(DB_DIR, f'{self.CHAIN_SLUG}_products.db')
        self.conn = sqlite3.connect(db_path)

        # Створюємо 3 таблиці
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS all_products (
                product_id TEXT PRIMARY KEY,
                title TEXT,
                image_url TEXT,
                price TEXT,
                old_price TEXT,
                description TEXT
            )
        ''')
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS sale_products (
                product_id TEXT PRIMARY KEY,
                title TEXT,
                image_url TEXT,
                price TEXT,
                old_price TEXT,
                description TEXT
            )
        ''')
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS regular_products (
                product_id TEXT PRIMARY KEY,
                title TEXT,
                image_url TEXT,
                price TEXT,
                description TEXT
            )
        ''')

        # Очищуємо таблиці перед новим збором
        self.conn.execute('DELETE FROM all_products')
        self.conn.execute('DELETE FROM sale_products')
        self.conn.execute('DELETE FROM regular_products')
        self.conn.commit()

        logger.info(f"[{self.CHAIN_NAME}] БД готова: {db_path}")

    # ─── Головний метод ───

    def scrape(self):
        """
        Головний метод: обходить всі категорії з пагінацією.
        Використовує curl_cffi для HTTP-запитів та BeautifulSoup для парсингу.
        """
        self.setup_database()

        total = len(self.CATALOG_CATEGORIES)
        logger.info(f"[{self.CHAIN_NAME}] Починаємо збір даних ({total} категорій)...")

        for i, path in enumerate(self.CATALOG_CATEGORIES, 1):
            logger.info(f"[{self.CHAIN_NAME}] [{i}/{total}] Парсинг: {path}")
            self._scrape_category(path)
            # Відпочинок між категоріями (захист від бану)
            time.sleep(random.uniform(2.0, 4.0))

        logger.info(f"[{self.CHAIN_NAME}] Збір даних завершено!")

    def _scrape_category(self, path: str):
        """Збирає всі товари з однієї категорії з пагінацією."""
        for page_num in range(1, self.MAX_PAGES + 1):
            url = f"{self.BASE_URL}{path}?page={page_num}"

            try:
                response = requests.get(
                    url,
                    headers=self.HEADERS,
                    impersonate=self.IMPERSONATE,
                    timeout=15,
                )
            except Exception as e:
                logger.error(f"[{self.CHAIN_NAME}] Помилка мережі: {e}")
                break

            if response.status_code != 200:
                logger.warning(
                    f"[{self.CHAIN_NAME}] HTTP {response.status_code} для {url}"
                )
                break

            products = self._parse_products(response.text)

            if not products:
                break

            # Зберігаємо з дедуплікацією
            saved = 0
            for p in products:
                pid = p["product_id"]
                if pid not in self._seen_ids:
                    self._seen_ids.add(pid)
                    self._save_product(p)
                    saved += 1

            logger.info(
                f"[{self.CHAIN_NAME}]   Сторінка {page_num}: "
                f"{len(products)} знайдено, {saved} нових"
            )

            self.conn.commit()

            # Перевіряємо наявність наступної сторінки
            soup = BeautifulSoup(response.text, 'lxml')
            if not self._has_next_page(soup, page_num):
                break

            time.sleep(random.uniform(0.5, 1.5))

    # ─── Абстрактні методи ───

    @abstractmethod
    def _parse_products(self, html: str) -> list[dict]:
        """
        Парсить HTML-сторінку каталогу → список товарів.
        Кожний товар: {product_id, title, image_url, price, old_price, description, is_sale}
        """
        pass

    def _has_next_page(self, soup: BeautifulSoup, current_page: int) -> bool:
        """
        Перевіряє, чи є посилання на наступну сторінку.
        Можна перевизначити у підкласах.
        """
        next_links = soup.select(f"a[href*='page={current_page + 1}']")
        return len(next_links) > 0

    # ─── Збереження товару ───

    def _save_product(self, product: dict):
        """
        Зберігає товар у 3 таблиці:
        1. all_products    — завжди
        2. sale_products   — якщо є знижка
        3. regular_products — якщо без знижки
        """
        pid = product["product_id"]
        title = product["title"]
        image_url = product.get("image_url", "")
        price = product["price"]
        old_price = product.get("old_price")
        description = product.get("description", "")
        is_sale = product.get("is_sale", False)

        # 1. Завжди в all_products
        self.conn.execute(
            "INSERT OR REPLACE INTO all_products VALUES (?,?,?,?,?,?)",
            (pid, title, image_url, price, old_price, description)
        )

        # 2. Розподіл по sale / regular
        if is_sale and old_price:
            self.conn.execute(
                "INSERT OR REPLACE INTO sale_products VALUES (?,?,?,?,?,?)",
                (pid, title, image_url, price, old_price, description)
            )
        else:
            self.conn.execute(
                "INSERT OR REPLACE INTO regular_products VALUES (?,?,?,?,?)",
                (pid, title, image_url, price, description)
            )

    # ─── Закриття з'єднання ───

    def close(self):
        """Закриває з'єднання з базою даних."""
        if self.conn:
            self.conn.close()
            self.conn = None
        logger.info(f"[{self.CHAIN_NAME}] З'єднання закрите.")
