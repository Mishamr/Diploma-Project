"""
Scraper Factory — фабричний метод для створення скреперів.

Використання:
    scraper = ScraperFactory.get_scraper('atb')
    scraper.scrape()
    scraper.close()
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Реєстр: chain_slug → клас скрепера
_REGISTRY: dict[str, Any] = {}


def register(slug: str):
    """Декоратор для реєстрації скрепера у фабриці."""
    def decorator(cls):
        _REGISTRY[slug] = cls
        logger.debug(f"Зареєстровано скрепер: {slug} → {cls.__name__}")
        return cls
    return decorator


class ScraperFactory:
    """
    Фабрика скреперів — створює потрібний скрепер за назвою магазину.

    Нові магазини додаються автоматично через декоратор @register('slug').
    """

    @staticmethod
    def get_scraper(store_name: str, shop_id: str = "1") -> Any:
        """
        Створити та повернути екземпляр скрепера для мережі.

        Args:
            store_name: ідентифікатор мережі ('atb', 'silpo', ...)
            shop_id: ID магазину

        Returns:
            Екземпляр скрепера

        Raises:
            ValueError: якщо скрепер не знайдено
        """
        scraper_class = _REGISTRY.get(store_name.lower())

        if not scraper_class:
            available = sorted(_REGISTRY.keys())
            raise ValueError(
                f"Фабрика не знає, як парсити магазин: '{store_name}'. "
                f"Доступні: {available}. Пиши новий адаптер!"
            )

        return scraper_class(shop_id=shop_id)

    @staticmethod
    def get_available_chains() -> list[str]:
        """Повертає відсортований список доступних мереж."""
        return sorted(_REGISTRY.keys())

    @staticmethod
    def run_all(shop_id: str = "1"):
        """Запускає всі зареєстровані скрепери."""
        for slug in sorted(_REGISTRY.keys()):
            logger.info(f"── Запуск скрепера: {slug} ──")
            scraper = ScraperFactory.get_scraper(slug, shop_id=shop_id)
            try:
                scraper.scrape()
            except Exception as e:
                logger.error(f"Помилка скрепера {slug}: {e}")
            finally:
                scraper.close()

        logger.info("══ Всі скрепери завершили роботу ══")
