from unittest.mock import MagicMock, patch

import pytest

from apps.core.models import Store, Product, StoreItem
from apps.scraper import tasks


@pytest.mark.django_db
def test_get_scraper_for_atb_store():
    store = Store.objects.create(name="АТБ", url_base="https://atbmarket.com/")
    product = Product.objects.create(name="Гречка")
    item = StoreItem.objects.create(
        store=store,
        product=product,
        price="0.00",
        url="https://atbmarket.com/product-page",
    )

    scraper = tasks._get_scraper_for_store_item(item)
    # Class name check to avoid importing engine classes here
    assert scraper.__class__.__name__ == "ATBScraper"


@pytest.mark.django_db
def test_get_scraper_for_silpo_store():
    store = Store.objects.create(name="Сільпо", url_base="https://silpo.ua/")
    product = Product.objects.create(name="Молоко 2.5%")
    item = StoreItem.objects.create(
        store=store,
        product=product,
        price="0.00",
        url="https://silpo.ua/product-page",
    )

    scraper = tasks._get_scraper_for_store_item(item)
    assert scraper.__class__.__name__ == "SilpoScraper"


@pytest.mark.django_db
def test_scrape_store_item_task_updates_price(monkeypatch):
    store = Store.objects.create(name="АТБ", url_base="https://atbmarket.com/")
    product = Product.objects.create(name="Хліб")
    item = StoreItem.objects.create(
        store=store,
        product=product,
        price="0.00",
        url="https://atbmarket.com/product-page",
    )

    fake_scraper = MagicMock()
    fake_scraper.scrape_product.return_value = {
        "status": "success",
        "price": 28.50,
    }

    # Patch router to return our fake scraper to avoid real Selenium usage
    monkeypatch.setattr(tasks, "_get_scraper_for_store_item", lambda _: fake_scraper)

    result = tasks.scrape_store_item_task(item.id)
    item.refresh_from_db()

    assert "Updated" in result
    assert float(item.price) == 28.50

