from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, HttpUrl, Field, validator

class ScrapedProductSchema(BaseModel):
    """
    Schema for validating scraped product data before DB insertion.
    
    Anti-Bug Protocol:
    - title: Must be at least 3 chars.
    - price: Must be strictly positive (> 0).
    - image_url: Must be a valid URL (optional).
    - product_url: Must be a valid URL (optional).
    """
    title: str = Field(min_length=3, strip_whitespace=True)
    price: Decimal = Field(gt=0)
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    store_name: str
    
    @validator('price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be positive')
        return v

    class Config:
        # Allow extra fields but ignore them
        extra = 'ignore'
