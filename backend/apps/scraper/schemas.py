"""
Pydantic schemas for scraper data validation.
"""

from pydantic import BaseModel, Field
from typing import Optional


class ScrapedProduct(BaseModel):
    """Validated scraped product data."""
    title: str
    price: float = Field(gt=0)
    old_price: Optional[float] = None
    image_url: str = ''
    in_stock: bool = True
    chain_name: str = ''
    external_store_id: str = ''
    url: str = ''
    category: str = ''

    # Backward-compatible aliases
    class Config:
        populate_by_name = True

    @property
    def is_promo(self) -> bool:
        return self.old_price is not None and self.old_price > self.price

    @property
    def discount_pct(self) -> int:
        if self.is_promo and self.old_price > 0:
            return round((1 - self.price / self.old_price) * 100)
        return 0


class StoreMetadata(BaseModel):
    """Store context for scraping."""
    chain_slug: str
    store_id: int
    external_id: str = ''
    city: str = 'Київ'
    latitude: float = 0.0
    longitude: float = 0.0


class ScrapeResult(BaseModel):
    """Result of a scrape job."""
    chain_slug: str
    store_id: int
    category_url: str
    products_count: int = 0
    errors_count: int = 0
    products: list[ScrapedProduct] = []
    duration_sec: float = 0.0
    success: bool = True
    error_message: str = ''
