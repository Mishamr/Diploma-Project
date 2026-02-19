"""
Django Admin configuration for Fiscus core models.

Includes admin actions for:
- Running scrapers for specific stores
- Monitoring scraping task status in real-time
- Managing products, stores, and price history
"""
import logging
from datetime import datetime, timedelta
from django.contrib import admin, messages
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q

from apps.core.models import (
    Store, Product, StoreItem,
    ShoppingList, ShoppingListItem,
    Price, UserProfile, TaskLog,
)
from apps.scraper.tasks import (
    scrape_all_items_periodic,
    scrape_single_store,
    scrape_store_item_task
)

logger = logging.getLogger(__name__)


# ─── INLINE MODELS ────────────────────────────────────────────────────

class ShoppingListItemInline(admin.TabularInline):
    """Inline editor for shopping list items."""
    model = ShoppingListItem
    extra = 0
    raw_id_fields = ('product',)


class PriceHistoryInline(admin.TabularInline):
    """Inline display of price history for a product."""
    model = Price
    extra = 0
    raw_id_fields = ('store',)
    readonly_fields = ('price_value', 'in_stock', 'scraped_at')
    can_delete = False
    
    def has_add_permission(self, request):
        return False


# ─── STORE ADMIN ──────────────────────────────────────────────────────

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    """
    Admin interface for managing physical store locations.
    
    Features:
    - Bulk scraping actions
    - Display of active/inactive status
    - Real-time task status
    """
    list_display = (
        'chain_name', 'address_short', 'external_store_id',
        'is_active_badge', 'price_count', 'last_updated_badge'
    )
    list_filter = ('is_active', 'chain_name')
    search_fields = ('chain_name', 'address', 'external_store_id')
    readonly_fields = ('external_store_id', 'price_count', 'last_updated')
    
    fieldsets = (
        ("Store Location", {
            'fields': ('chain_name', 'address', 'is_active')
        }),
        ("Technical Details", {
            'fields': ('external_store_id', 'url_base'),
            'classes': ('collapse',)
        }),
        ("Geographic Coordinates", {
            'fields': ('latitude', 'longitude'),
            'description': 'GPS coordinates for distance calculation'
        }),
        ("Statistics", {
            'fields': ('price_count', 'last_updated'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['scrape_store_now', 'activate_stores', 'deactivate_stores']
    
    def address_short(self, obj):
        """Display shortened address."""
        addr = obj.address
        return addr[:40] + "..." if len(addr) > 40 else addr
    address_short.short_description = "Address"
    
    def is_active_badge(self, obj):
        """Display active/inactive status with color."""
        if obj.is_active:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Active</span>'
            )
        return format_html(
            '<span style="color: red; font-weight: bold;">✗ Inactive</span>'
        )
    is_active_badge.short_description = "Status"
    
    def price_count(self, obj):
        """Count of prices for this store."""
        count = obj.price_history.count()
        return format_html(
            '<span style="background-color: #eee; padding: 3px 6px; '
            'border-radius: 3px;">{}</span>', count
        )
    price_count.short_description = "Prices in DB"
    
    def last_updated(self, obj):
        """Last time prices were updated."""
        latest = obj.price_history.order_by('-scraped_at').first()
        if latest:
            return latest.scraped_at
        return "Never"
    last_updated.short_description = "Last Updated"
    
    def last_updated_badge(self, obj):
        """Show last update time with freshness indicator."""
        latest = obj.price_history.order_by('-scraped_at').first()
        if not latest:
            return format_html(
                '<span style="color: gray;">never</span>'
            )
        
        time_ago = datetime.now(latest.scraped_at.tzinfo) - latest.scraped_at
        hours = time_ago.total_seconds() / 3600
        
        if hours < 1:
            color = 'green'
            label = '< 1h ago'
        elif hours < 24:
            color = 'orange'
            label = f'{int(hours)}h ago'
        else:
            color = 'red'
            label = f'{int(hours/24)}d ago'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>', 
            color, label
        )
    last_updated_badge.short_description = "Last Update"
    
    def scrape_store_now(self, request, queryset):
        """
        Admin action: Scrape selected stores NOW.
        
        Queues Celery tasks to scrape all items from selected stores.
        """
        total_items = 0
        
        for store in queryset.filter(is_active=True):
            try:
                # Queue scraping task for this store
                task = scrape_single_store.apply_async(
                    args=[store.id],
                    countdown=0
                )
                total_items += store.price_history.count()
                logger.info(
                    f"Queued scraping for {store.chain_name} "
                    f"({store.address}). Task ID: {task.id}"
                )
            except Exception as e:
                logger.error(f"Failed to queue scrape for store {store.id}: {e}")
                self.message_user(
                    request,
                    f"Error queueing scrape for {store.chain_name}: {e}",
                    messages.ERROR
                )
        
        self.message_user(
            request,
            f"✓ Scraping queued for {queryset.count()} store(s). "
            f"Total items to scrape: {total_items}. "
            f"Check Celery logs for progress.",
            messages.SUCCESS
        )
    scrape_store_now.short_description = "🔄 Scrape selected stores NOW"
    
    def activate_stores(self, request, queryset):
        """Admin action: Activate selected stores."""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f"✓ Activated {updated} store(s).",
            messages.SUCCESS
        )
    activate_stores.short_description = "✓ Activate selected"
    
    def deactivate_stores(self, request, queryset):
        """Admin action: Deactivate selected stores."""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f"✓ Deactivated {updated} store(s).",
            messages.SUCCESS
        )
    deactivate_stores.short_description = "✗ Deactivate selected"


# ─── PRODUCT ADMIN ────────────────────────────────────────────────────

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """
    Admin interface for managing products.
    
    Features:
    - Price history inline
    - Search by name/category
    - Display cheapest price across stores
    """
    list_display = ('name', 'category', 'cheapest_price', 'price_count', 'barcode_short')
    search_fields = ('name', 'category', 'barcode')
    list_filter = ('category',)
    readonly_fields = ('price_count', 'price_stats')
    inlines = [PriceHistoryInline]
    
    fieldsets = (
        ("Basic Info", {
            'fields': ('name', 'category', 'barcode')
        }),
        ("Media", {
            'fields': ('image_url',)
        }),
        ("Price Statistics", {
            'fields': ('price_count', 'price_stats'),
            'classes': ('collapse',)
        }),
    )
    
    def barcode_short(self, obj):
        """Display barcode (shortened if long)."""
        if obj.barcode and len(obj.barcode) > 15:
            return obj.barcode[:15] + "..."
        return obj.barcode or "-"
    barcode_short.short_description = "Barcode"
    
    def cheapest_price(self, obj):
        """Show the cheapest price for this product across all stores."""
        cheapest = obj.price_history.order_by('price_value').first()
        if cheapest:
            return format_html(
                '<span style="color: green; font-weight: bold;">{} ₴</span> '
                '<span style="font-size: 0.9em; color: gray;">@ {}</span>',
                cheapest.price_value,
                cheapest.store.chain_name[:20]
            )
        return "-"
    cheapest_price.short_description = "Cheapest Price"
    
    def price_count(self, obj):
        """Count of price records for this product."""
        count = obj.price_history.count()
        return format_html(
            '<strong>{}</strong> store(s)', count
        )
    price_count.short_description = "In Stores"
    
    def price_stats(self, obj):
        """Display statistics about prices."""
        prices = obj.price_history.order_by('price_value')
        if not prices.exists():
            return "No price data yet"
        
        min_price = prices.first().price_value
        max_price = prices.last().price_value
        avg_price = sum(p.price_value for p in prices) / prices.count()
        
        return format_html(
            '<div style="font-family: monospace;">'
            'Min: <span style="color: green;">{} ₴</span><br>'
            'Avg: <span style="color: blue;">{:.2f} ₴</span><br>'
            'Max: <span style="color: red;">{} ₴</span><br>'
            'Stores: <span style="color: gray;">{}</span>'
            '</div>',
            min_price, avg_price, max_price, prices.count()
        )
    price_stats.short_description = "Price Statistics"


# ─── PRICE ADMIN ──────────────────────────────────────────────────────

@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    """
    Admin interface for price history.
    
    Features:
    - Filter by store location
    - Display store/product details
    - Show freshness of data
    """
    list_display = ('product_name', 'store_location', 'price_value', 'in_stock_badge', 'freshness')
    list_filter = ('store__chain_name', 'in_stock', 'scraped_at')
    search_fields = ('product__name', 'store__chain_name', 'store__address')
    readonly_fields = ('product', 'store', 'scraped_at', 'freshness')
    date_hierarchy = 'scraped_at'
    
    fieldsets = (
        ("Product & Store", {
            'fields': ('product', 'store')
        }),
        ("Price Information", {
            'fields': ('price_value', 'in_stock')
        }),
        ("Metadata", {
            'fields': ('scraped_at', 'freshness'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_in_stock', 'mark_as_out_of_stock']
    
    def product_name(self, obj):
        """Display product name with link."""
        return format_html(
            '<a href="{}">{}</a>',
            reverse('admin:core_product_change', args=[obj.product.id]),
            obj.product.name
        )
    product_name.short_description = "Product"
    
    def store_location(self, obj):
        """Display store location."""
        return format_html(
            '{}<br><span style="font-size: 0.85em; color: gray;">{}</span>',
            obj.store.chain_name,
            obj.store.address[:40]
        )
    store_location.short_description = "Store"
    
    def in_stock_badge(self, obj):
        """Display in-stock status as badge."""
        if obj.in_stock:
            return format_html(
                '<span style="background-color: #90EE90; padding: 2px 6px; '
                'border-radius: 3px; color: darkgreen; font-weight: bold;">✓ In Stock</span>'
            )
        return format_html(
            '<span style="background-color: #FFB6C1; padding: 2px 6px; '
            'border-radius: 3px; color: darkred; font-weight: bold;">✗ Out</span>'
        )
    in_stock_badge.short_description = "Status"
    
    def freshness(self, obj):
        """Show how old the price record is."""
        time_ago = datetime.now(obj.scraped_at.tzinfo) - obj.scraped_at
        hours = time_ago.total_seconds() / 3600
        days = hours / 24
        
        if hours < 1:
            return format_html(
                '<span style="color: green; font-weight: bold;">Fresh (< 1h)</span>'
            )
        elif hours < 24:
            return format_html(
                '<span style="color: orange;">{:.0f}h ago</span>', hours
            )
        elif days < 7:
            return format_html(
                '<span style="color: #FFA500;">{:.0f}d ago</span>', days
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">Stale ({:.0f}d)</span>', days
            )
    freshness.short_description = "Age"
    
    def mark_as_in_stock(self, request, queryset):
        """Admin action: Mark selected prices as in stock."""
        updated = queryset.update(in_stock=True)
        self.message_user(
            request,
            f"✓ Marked {updated} price(s) as in stock.",
            messages.SUCCESS
        )
    mark_as_in_stock.short_description = "✓ Mark as In Stock"
    
    def mark_as_out_of_stock(self, request, queryset):
        """Admin action: Mark selected prices as out of stock."""
        updated = queryset.update(in_stock=False)
        self.message_user(
            request,
            f"✓ Marked {updated} price(s) as out of stock.",
            messages.SUCCESS
        )
    mark_as_out_of_stock.short_description = "✗ Mark as Out of Stock"


# ─── SHOPPING LIST ADMIN ──────────────────────────────────────────────

@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    """Admin interface for shopping lists."""
    list_display = ('name', 'user', 'item_count', 'created_at')
    list_filter = ('user', 'created_at')
    search_fields = ('name', 'user__username')
    readonly_fields = ('created_at', 'item_count')
    inlines = [ShoppingListItemInline]
    
    def item_count(self, obj):
        """Count items in the list."""
        return obj.shoppinglistitem_set.count()
    item_count.short_description = "Items"




# ─── TASK LOG ADMIN (Real-time Monitoring) ────────────────────────────

@admin.register(TaskLog)
class TaskLogAdmin(admin.ModelAdmin):
    """
    Admin interface for monitoring Celery task execution.
    
    Real-time dashboard showing:
    - Task status (running, completed, failed)
    - Progress bar (items processed/total)
    - Error messages
    """
    list_display = (
        'task_name_short', 'store_link', 'status_badge', 
        'progress_bar', 'error_indicator', 'age'
    )
    list_filter = ('status', 'task_name', '-created_at')
    search_fields = ('task_name', 'store__chain_name', 'task_id')
    readonly_fields = (
        'task_id', 'created_at', 'started_at', 'completed_at',
        'progress_percent', 'progress_details'
    )
    
    fieldsets = (
        ("Task Information", {
            'fields': ('task_id', 'task_name', 'store')
        }),
        ("Status", {
            'fields': ('status', 'message', 'error_message')
        }),
        ("Progress", {
            'fields': ('items_total', 'items_processed', 'items_failed', 'progress_percent', 'progress_details')
        }),
        ("Timestamps", {
            'fields': ('created_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_cancelled']
    
    def task_name_short(self, obj):
        """Display shortened task name."""
        name = obj.task_name
        return name[:40] + "..." if len(name) > 40 else name
    task_name_short.short_description = "Task"
    
    def store_link(self, obj):
        """Display linked store."""
        if obj.store:
            return format_html(
                '<a href="{}">{}</a>',
                reverse('admin:core_store_change', args=[obj.store.id]),
                f"{obj.store.chain_name}"
            )
        return "N/A"
    store_link.short_description = "Store"
    
    def status_badge(self, obj):
        """Display status with color."""
        colors = {
            'pending': '#ccc',
            'started': '#87CEEB',
            'progress': '#FFD700',
            'completed': '#90EE90',
            'failed': '#FF6B6B',
            'cancelled': '#A9A9A9',
        }
        
        color = colors.get(obj.status, '#ccc')
        return format_html(
            '<span style="background-color: {}; padding: 3px 8px; '
            'border-radius: 3px; color: black; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = "Status"
    
    def progress_bar(self, obj):
        """Display visual progress bar."""
        if obj.items_total == 0:
            return "No items"
        
        percent = obj.progress_percent
        filled = int(percent / 5)  # 20 chars max
        empty = 20 - filled
        
        return format_html(
            '<div style="display: flex; align-items: center; gap: 10px;">'
            '<div style="width: 150px; height: 20px; background-color: #eee; border-radius: 3px; overflow: hidden;">'
            '<div style="width: {}%; height: 100%; background-color: #4CAF50;"></div>'
            '</div>'
            '<span style="font-weight: bold;">{}/{} ({}%)</span>'
            '</div>',
            percent, obj.items_processed, obj.items_total, percent
        )
    progress_bar.short_description = "Progress"
    
    def error_indicator(self, obj):
        """Display error count if any."""
        if obj.items_failed > 0:
            return format_html(
                '<span style="color: red; font-weight: bold;">⚠ {} failed</span>',
                obj.items_failed
            )
        return "-"
    error_indicator.short_description = "Errors"
    
    def age(self, obj):
        """Show how long the task is running."""
        from datetime import datetime
        
        now = datetime.now(obj.created_at.tzinfo if obj.created_at else None)
        elapsed = now - obj.created_at
        
        if elapsed.total_seconds() < 60:
            return format_html('<span style="color: green;">just now</span>')
        elif elapsed.total_seconds() < 3600:
            minutes = int(elapsed.total_seconds() / 60)
            return format_html('<span style="color: blue;">{}m ago</span>', minutes)
        else:
            hours = int(elapsed.total_seconds() / 3600)
            return format_html('<span style="color: orange;">{}h ago</span>', hours)
    age.short_description = "Age"
    
    def progress_details(self, obj):
        """Detailed progress information."""
        if obj.items_total == 0:
            return "Task not started or has no items"
        
        return format_html(
            '<div style="font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">'
            'Total: <strong>{}</strong><br>'
            'Processed: <strong style="color: green;">{}</strong><br>'
            'Failed: <strong style="color: red;">{}</strong><br>'
            'Remaining: <strong style="color: blue;">{}</strong><br>'
            'Progress: <strong>{}%</strong>'
            '</div>',
            obj.items_total,
            obj.items_processed,
            obj.items_failed,
            obj.items_total - obj.items_processed,
            obj.progress_percent
        )
    progress_details.short_description = "Progress Details"
    
    def mark_as_cancelled(self, request, queryset):
        """Admin action: Mark tasks as cancelled."""
        updated = queryset.filter(status__in=['pending', 'started', 'progress']).update(
            status='cancelled',
            error_message='Cancelled by admin'
        )
        self.message_user(
            request,
            f"✓ Marked {updated} task(s) as cancelled.",
            messages.SUCCESS
        )
    mark_as_cancelled.short_description = "Cancel selected tasks"
    
    def has_add_permission(self, request):
        """Prevent manual task creation."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only allow deletion of completed tasks."""
        if obj and obj.is_complete:
            return True
        return False


# ─── USER PROFILE ADMIN ────────────────────────────────────────────────

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for user profiles."""
    list_display = ('user', 'premium_badge', 'created_date')
    list_filter = ('is_premium',)
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('user', 'created_date')
    
    def premium_badge(self, obj):
        """Display premium status."""
        if obj.is_premium:
            return format_html(
                '<span style="background-color: gold; padding: 3px 6px; '
                'border-radius: 3px; color: black; font-weight: bold;">⭐ Premium</span>'
            )
        return format_html(
            '<span style="background-color: #ddd; padding: 3px 6px; '
            'border-radius: 3px; color: gray;">Free</span>'
        )
    premium_badge.short_description = "Plan"
    
    def created_date(self, obj):
        """Show user creation date."""
        return obj.user.date_joined
    created_date.short_description = "Joined"


# ─── STORE ITEM ADMIN (for advanced users) ────────────────────────────

@admin.register(StoreItem)
class StoreItemAdmin(admin.ModelAdmin):
    """Admin interface for store items (product-store links)."""
    list_display = (
        'product_link', 'store_link', 'price', 
        'quality_score', 'in_stock_badge', 'updated_at'
    )
    list_filter = ('store__chain_name', 'updated_at')
    search_fields = ('product__name', 'store__chain_name')
    readonly_fields = ('updated_at',)
    raw_id_fields = ('product', 'store')
    
    fieldsets = (
        ("Link", {
            'fields': ('product', 'store')
        }),
        ("Pricing", {
            'fields': ('price', 'price_per_100g', 'weight_gram')
        }),
        ("Quality", {
            'fields': ('quality_score', 'ingredients_text')
        }),
        ("Metadata", {
            'fields': ('url', 'updated_at')
        }),
    )
    
    def product_link(self, obj):
        """Display product name as link."""
        return format_html(
            '<a href="{}">{}</a>',
            reverse('admin:core_product_change', args=[obj.product.id]),
            obj.product.name
        )
    product_link.short_description = "Product"
    
    def store_link(self, obj):
        """Display store location as link."""
        return format_html(
            '<a href="{}">{}</a>',
            reverse('admin:core_store_change', args=[obj.store.id]),
            f"{obj.store.chain_name} ({obj.store.address[:30]})"
        )
    store_link.short_description = "Store"
    
    def in_stock_badge(self, obj):
        """Display availability."""
        return "✓" if obj.price > 0 else "✗"
    in_stock_badge.short_description = "Available"


# ─── ADMIN SITE CUSTOMIZATION ─────────────────────────────────────────

admin.site.site_header = "🛒 Fiscus Admin Panel"
admin.site.site_title = "Fiscus Management"
admin.site.index_title = "Welcome to Fiscus Admin"
