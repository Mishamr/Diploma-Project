from django.contrib import admin

from .models import (
    Category,
    Chain,
    Price,
    Product,
    ShoppingList,
    ShoppingListItem,
    Store,
    StoreItem,
    UserProfile,
)


@admin.register(Chain)
class ChainAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "scraper_type", "is_active", "created_at"]
    list_filter = ["scraper_type", "is_active"]
    search_fields = ["name", "slug"]


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ["name", "chain", "city", "latitude", "longitude", "is_active"]
    list_filter = ["chain", "city", "is_active"]
    search_fields = ["name", "address"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent"]
    search_fields = ["name"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "brand", "weight", "category", "updated_at"]
    list_filter = ["category", "brand"]
    search_fields = ["name", "normalized_name", "brand"]


@admin.register(StoreItem)
class StoreItemAdmin(admin.ModelAdmin):
    list_display = ["product", "store", "in_stock", "last_scraped"]
    list_filter = ["in_stock", "store__chain"]
    search_fields = ["product__name"]


@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ["store_item", "price", "old_price", "is_promo", "recorded_at"]
    list_filter = ["is_promo", "recorded_at"]
    date_hierarchy = "recorded_at"


@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "created_at"]


@admin.register(ShoppingListItem)
class ShoppingListItemAdmin(admin.ModelAdmin):
    list_display = ["shopping_list", "product", "custom_name", "quantity", "is_checked"]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "city", "family_size", "monthly_budget"]
