from django.db import models


class Store(models.Model):
    """
    Represents a physical store or a retail chain.
    """

    name = models.CharField(max_length=100, verbose_name="Назва магазину")
    url_base = models.URLField(verbose_name="Базове URL")
    latitude = models.FloatField(null=True, blank=True, verbose_name="Широта")
    longitude = models.FloatField(null=True, blank=True, verbose_name="Довгота")

    class Meta:
        verbose_name = "Магазин"
        verbose_name_plural = "Магазини"

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Global product catalog (normalized name).
    Example: 'Buckwheat' regardless of brand.
    """

    name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name="Назва продукту",
    )
    category = models.CharField(max_length=100, blank=True, verbose_name="Категорія")
    image_url = models.URLField(blank=True, null=True, verbose_name="Зображення (URL)")
    barcode = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True,
        verbose_name="Штрихкод",
    )

    class Meta:
        verbose_name = "Продукт"
        verbose_name_plural = "Каталог Продуктів"

    def __str__(self):
        return self.name


class StoreItem(models.Model):
    """
    Specific item in a specific store with price history.
    """

    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="store_items",
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Ціна (UAH)",
    )
    # New fields for Quality Analysis
    weight_gram = models.FloatField(null=True, blank=True, verbose_name="Вага (г)")
    price_per_100g = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Ціна за 100г"
    )
    ingredients_text = models.TextField(blank=True, verbose_name="Склад")
    quality_score = models.IntegerField(
        null=True, blank=True, verbose_name="Оцінка якості (1-10)"
    )
    
    url = models.URLField(
        max_length=500,
        blank=True,
        verbose_name="Посилання на товар",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Останнє оновлення",
    )

    class Meta:
        unique_together = ("store", "product") # Ensures uniqueness per store/product
        ordering = ["price"]  # Default sort by cheapest

        verbose_name = "Товарна позиція"
        verbose_name_plural = "Ціни в магазинах"

    def __str__(self):
        return f"{self.product.name} in {self.store.name}: {self.price} UAH"


class ShoppingList(models.Model):
    """
    User shopping list (MVP: without auth restrictions).
    """

    # In a real app this should be FK to request.user
    name = models.CharField(max_length=100, default="My Shopping List")
    created_at = models.DateTimeField(auto_now_add=True)
    items = models.ManyToManyField(Product, through="ShoppingListItem")

    class Meta:
        verbose_name = "Список покупок"
        verbose_name_plural = "Списки покупок"

    def __str__(self):
        return self.name


class ShoppingListItem(models.Model):
    """
    Through model for product entries in a shopping list.
    """

    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    is_checked = models.BooleanField(default=False)


    class Meta:
        verbose_name = "Позиція списку"
        verbose_name_plural = "Позиції списку"


class Price(models.Model):
    """
    Log of prices for history tracking as requested.
    One-to-Many with Product.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_history')
    store_name = models.CharField(max_length=200)
    price_value = models.FloatField()
    scraped_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scraped_at']
        verbose_name = "Історія цін"


from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_premium = models.BooleanField(default=False, verbose_name="Premium Status")

    class Meta:
        verbose_name = "Профіль Користувача"

    def __str__(self):
        return f"{self.user.username} Profile"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
