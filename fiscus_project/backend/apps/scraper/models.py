"""
Database layer for Fiscus scraping engine.

Uses SQLAlchemy ORM with SQLite for standalone operation.
Provides Product model and upsert logic to prevent duplicates.

Usage:
    from apps.scraper.models import init_db, upsert_product, get_session

    init_db()
    session = get_session()
    upsert_product(session, {
        "store_name": "ATB",
        "name": "Гречка 1кг",
        "price": 39.90,
        "image_url": "https://...",
        "product_url": "https://...",
    })
"""

import logging
import os
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    create_engine,
    event,
)
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("fiscus.models")

# ─── Config ───────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "products.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


# ─── Model ────────────────────────────────────────────────────────────
class Product(Base):
    """
    Scraped product record.

    Uniqueness is enforced on `product_url` so re-scraping the same
    page will UPDATE the price instead of creating a duplicate.
    """

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    store_name = Column(String(50), nullable=False, index=True)
    name = Column(String(300), nullable=False)
    price = Column(Float, nullable=False)
    image_url = Column(String(500), nullable=True)
    product_url = Column(String(500), unique=True, nullable=False)
    last_updated = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return (
            f"<Product(store={self.store_name!r}, "
            f"name={self.name!r}, price={self.price})>"
        )


# ─── WAL mode for better concurrent reads ─────────────────────────────
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.close()


# ─── Public helpers ───────────────────────────────────────────────────
def init_db() -> None:
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized at %s", DB_PATH)


def get_session():
    """Return a new SQLAlchemy session."""
    return SessionLocal()


def upsert_product(session, data: dict) -> Product:
    """
    Insert or update a product row.

    Parameters
    ----------
    session : sqlalchemy.orm.Session
    data : dict
        Required keys: store_name, name, price, product_url
        Optional keys: image_url

    Returns
    -------
    Product instance (persisted).

    Raises
    ------
    KeyError if required keys are missing.
    """
    # Validate required fields
    for key in ("store_name", "name", "price", "product_url"):
        if key not in data:
            raise KeyError(f"Missing required key: '{key}'")

    if data["price"] is None or data["price"] <= 0:
        raise ValueError(f"Invalid price: {data['price']} for '{data.get('name')}'")

    try:
        existing = (
            session.query(Product)
            .filter(Product.product_url == data["product_url"])
            .first()
        )

        if existing:
            existing.price = data["price"]
            existing.name = data.get("name", existing.name)
            existing.image_url = data.get("image_url", existing.image_url)
            existing.last_updated = datetime.now(timezone.utc)
            session.commit()
            return existing

        product = Product(
            store_name=data["store_name"],
            name=data["name"],
            price=data["price"],
            image_url=data.get("image_url"),
            product_url=data["product_url"],
        )
        session.add(product)
        session.commit()
        return product

    except Exception:
        session.rollback()
        raise
