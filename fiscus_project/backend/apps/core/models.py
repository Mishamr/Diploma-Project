from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Store(models.Model):
    """
    Represents a specific physical store location (not a chain, but a location).
    
    Example for ATB:
    - chain_name="ATB" (retailer brand)
    - address="вул. Городоцька, 48" (specific location)
    - external_store_id="atb-lviv-downtown" (from atbmarket.com's URL or API)
    - coordinates for walking distance calculation
    """

    chain_name = models.CharField(max_length=100, verbose_name="Ланцюг (АТБ, Сільпо)")
    address = models.CharField(max_length=255, verbose_name="Адреса (специфічна локація)")
    external_store_id = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="ID від рітейлера (атб/сільпо/ашан)",
        help_text="Унікальний ID використовується при скрепінгу для вибору магазину"
    )
    url_base = models.URLField(verbose_name="Базове URL ланцюга")
    latitude = models.FloatField(verbose_name="Широта")
    longitude = models.FloatField(verbose_name="Довгота")
    is_active = models.BooleanField(default=True, verbose_name="Активний")
    
    class Meta:
        verbose_name = "Магазин (локація)"
        verbose_name_plural = "Магазини (локації)"
        unique_together = ("chain_name", "address")  # Один адрес = один магазин

    def __str__(self):
        return f"{self.chain_name} - {self.address}"


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
    User shopping list with owner association.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shopping_lists',
        null=True,
        blank=True,
        verbose_name="Власник",
    )
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
    Historical price log linked to specific physical store location.
    
    Many-to-Many relationship: Product → Price → Store
    This allows tracking: "Молоко Галичина" = 45 грн у АТБ Городоцька + 44 грн у АТБ Сихів
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_history')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='price_history')
    price_value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ціна (грн)")
    in_stock = models.BooleanField(default=True, verbose_name="В наявності")
    scraped_at = models.DateTimeField(auto_now_add=True, verbose_name="Час скрепінгу")

    class Meta:
        ordering = ['-scraped_at']
        verbose_name = "Запис про ціну"
        verbose_name_plural = "Історія цін"
        indexes = [
            models.Index(fields=['product', 'store']),
            models.Index(fields=['-scraped_at']),
        ]

    def __str__(self):
        return f"{self.product.name} @ {self.store.chain_name} ({self.store.address}): {self.price_value} грн"


class TaskLog(models.Model):
    """
    Log entry for Celery tasks (scraping operations).
    
    Tracks:
    - Task status (started, progress, completed, failed)
    - Items processed/total
    - Errors and messages
    - Real-time monitoring for admin panel
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('started', 'Started'),
        ('progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    task_id = models.CharField(
        max_length=100, 
        unique=True,
        verbose_name="Celery Task ID",
        help_text="Unique ID from Celery broker"
    )
    task_name = models.CharField(max_length=255, verbose_name="Task Name")
    store = models.ForeignKey(
        Store, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='task_logs',
        verbose_name="Associated Store"
    )
    
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name="Status"
    )
    
    # Progress tracking
    items_total = models.IntegerField(default=0, verbose_name="Total Items")
    items_processed = models.IntegerField(default=0, verbose_name="Processed")
    items_failed = models.IntegerField(default=0, verbose_name="Failed")
    
    # Messages & errors
    message = models.TextField(blank=True, verbose_name="Status Message")
    error_message = models.TextField(blank=True, verbose_name="Error Message")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Started At")
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Actual Start")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Completed At")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Task Log"
        verbose_name_plural = "Task Logs"
        indexes = [
            models.Index(fields=['task_id']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        progress = f"{self.items_processed}/{self.items_total}" if self.items_total > 0 else "?"
        return f"[{self.status.upper()}] {self.task_name} ({progress})"
    
    @property
    def progress_percent(self):
        """Calculate progress as percentage."""
        if self.items_total == 0:
            return 0
        return int((self.items_processed / self.items_total) * 100)
    
    @property
    def is_complete(self):
        """Check if task has finished."""
        return self.status in ['completed', 'failed', 'cancelled']


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
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
