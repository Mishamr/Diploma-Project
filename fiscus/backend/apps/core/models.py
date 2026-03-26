"""
Core models for Fiscus: Smart Price.
Defines Store, Product, StoreItem, Price, ShoppingList, and UserProfile.
"""

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Chain(models.Model):
    """Retail chain (ATB, Silpo, Novus, etc.)."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    logo_url = models.URLField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    scraper_type = models.CharField(
        max_length=10,
        choices=[("light", "Light (requests+BS4)"), ("heavy", "Heavy (Selenium)")],
        default="light",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Store(models.Model):
    """Physical store location."""

    chain = models.ForeignKey(Chain, on_delete=models.CASCADE, related_name="stores")
    external_id = models.CharField(max_length=100, blank=True, default="")
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=500, blank=True, default="")
    city = models.CharField(max_length=100, default="Київ")
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["chain", "name"]

    def __str__(self):
        return f"{self.chain.name} — {self.name}"


class Category(models.Model):
    """Product category."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100, unique=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    """Unified product (matched across chains)."""

    name = models.CharField(max_length=500)
    normalized_name = models.CharField(max_length=500, db_index=True)
    brand = models.CharField(max_length=200, blank=True, default="")
    weight = models.CharField(max_length=100, blank=True, default="")
    weight_kg = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=20, default="шт")
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    image_url = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def best_image_url(self):
        if self.image_url:
            return self.image_url
        # Look for this product in other stores
        fallback = (
            self.__class__.objects.filter(normalized_name=self.normalized_name)
            .exclude(image_url="")
            .first()
        )
        if fallback:
            return fallback.image_url
        return ""

    class Meta:
        ordering = ["normalized_name"]

    def __str__(self):
        return self.name


class StoreItem(models.Model):
    """Product listing in a specific store."""

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="store_items"
    )
    external_product_id = models.CharField(max_length=200, blank=True, default="")
    in_stock = models.BooleanField(default=True)
    url = models.URLField(blank=True, default="", max_length=1000)
    last_scraped = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ["store", "product"]
        ordering = ["store", "product"]

    def __str__(self):
        return f"{self.product.name} @ {self.store}"


class Price(models.Model):
    """Price history record."""

    store_item = models.ForeignKey(
        StoreItem, on_delete=models.CASCADE, related_name="prices"
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    old_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    is_promo = models.BooleanField(default=False)
    promo_label = models.CharField(max_length=200, blank=True, default="")
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["store_item", "-recorded_at"]),
        ]

    def __str__(self):
        return f"{self.store_item.product.name}: {self.price} грн"

    @property
    def discount_pct(self):
        if self.old_price and self.old_price > 0:
            return round((1 - float(self.price) / float(self.old_price)) * 100)
        return 0


class ShoppingList(models.Model):
    """User's shopping list."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="shopping_lists"
    )
    name = models.CharField(max_length=200, default="Мій список")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class ShoppingListItem(models.Model):
    """Item in a shopping list."""

    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    custom_name = models.CharField(max_length=300, blank=True, default="")
    quantity = models.PositiveIntegerField(default=1)
    is_checked = models.BooleanField(default=False)

    def __str__(self):
        name = self.product.name if self.product else self.custom_name
        return f"{name} x{self.quantity}"


class Purchase(models.Model):
    """User transaction for analytics."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="purchases")
    chain_name = models.CharField(max_length=100)
    chain_slug = models.CharField(max_length=100)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    saved_amount = models.DecimalField(max_digits=10, decimal_places=2)
    items_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.chain_name} ({self.total_price} ₴)"


class UserProfile(models.Model):
    """Extended user profile."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    city = models.CharField(max_length=100, default="Київ")
    avatar_url = models.URLField(blank=True, default="")
    preferred_chains = models.ManyToManyField(Chain, blank=True)
    family_size = models.PositiveIntegerField(default=1)
    monthly_budget = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    # AI Personalization (Gemini-style)
    ai_custom_name = models.CharField(max_length=100, blank=True, default="")
    ai_allergies = models.TextField(
        blank=True, default="", help_text="Перелік алергій (напр. лактоза, горіхи)"
    )
    ai_instructions = models.TextField(
        blank=True,
        default="",
        help_text="Як бот має до вас звертатися або інші побажання",
    )

    # Ticketing & Subscription
    tickets = models.IntegerField(
        default=5, help_text="Тікети для доступу до AI функцій"
    )
    coins = models.IntegerField(default=0, help_text="Внутрішньоігрова валюта")
    is_pro = models.BooleanField(
        default=False,
        help_text="Чи є користувач PRO (безлімітні тікети та додаткові функції)",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile: {self.user.username}"
