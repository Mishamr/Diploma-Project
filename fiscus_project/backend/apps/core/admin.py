"""
Django Admin configuration for Fiscus core models.

Registers all models for the Django admin panel.
"""
from django.contrib import admin
from apps.core.models import (
    Store, Product, StoreItem,
    ShoppingList, ShoppingListItem,
    Price, UserProfile,
)


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'url_base', 'latitude', 'longitude')
    search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'barcode')
    search_fields = ('name', 'category')
    list_filter = ('category',)


@admin.register(StoreItem)
class StoreItemAdmin(admin.ModelAdmin):
    list_display = ('product', 'store', 'price', 'price_per_100g', 'quality_score', 'updated_at')
    list_filter = ('store',)
    search_fields = ('product__name',)
    raw_id_fields = ('product', 'store')


@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at')
    list_filter = ('user',)
    raw_id_fields = ('user',)


class ShoppingListItemInline(admin.TabularInline):
    model = ShoppingListItem
    extra = 0
    raw_id_fields = ('product',)


@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ('product', 'store_name', 'price_value', 'scraped_at')
    list_filter = ('store_name',)
    search_fields = ('product__name',)
    raw_id_fields = ('product',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_premium')
    list_filter = ('is_premium',)
