"""
DRF Serializers for Fiscus API.

This module defines serializers for converting model instances
to JSON and validating incoming data.
"""
from rest_framework import serializers
from apps.core.models import Store, Product, StoreItem, ShoppingList, ShoppingListItem


class StoreSerializer(serializers.ModelSerializer):
    """
    Serializer for Store model.
    
    Fields:
        id: Unique identifier
        name: Store name (e.g., "ATB", "Silpo")
        latitude: Geographic latitude
        longitude: Geographic longitude
    """
    class Meta:
        model = Store
        fields = ['id', 'name', 'latitude', 'longitude']


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product model (list view).
    
    Basic product information without pricing details.
    """
    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'image_url']


class StoreItemSerializer(serializers.ModelSerializer):
    """
    Serializer for StoreItem (product-store price relation).
    
    Includes store name and current price information.
    """
    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = StoreItem
        fields = ['id', 'store_id', 'store_name', 'price', 'updated_at', 'url']


class ProductDetailSerializer(ProductSerializer):
    """
    Serializer for Product model (detail view).
    
    Extends ProductSerializer with cheapest available option
    across all stores.
    """
    cheapest_option = serializers.SerializerMethodField()

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ['cheapest_option']

    def get_cheapest_option(self, obj) -> dict | None:
        """
        Find the cheapest store item for this product.
        
        Args:
            obj: Product instance.
        
        Returns:
            Serialized StoreItem or None if no items exist.
        """
        item = obj.store_items.order_by('price').first()
        if item:
            return StoreItemSerializer(item).data
        return None


class ShoppingListItemSerializer(serializers.ModelSerializer):
    """
    Serializer for items in a shopping list.
    
    Includes nested product data for display and
    write-only product_id for creation.
    """
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ShoppingListItem
        fields = ['id', 'product', 'product_id', 'quantity', 'is_checked']

    def validate_quantity(self, value: int) -> int:
        """Ensure quantity is positive."""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be positive")
        return value


class ShoppingListSerializer(serializers.ModelSerializer):
    """
    Serializer for ShoppingList model.
    
    Includes nested list items with product details and
    computed price comparison fields.
    """
    items = ShoppingListItemSerializer(
        source='shoppinglistitem_set',
        many=True,
        read_only=True
    )
    total_items = serializers.SerializerMethodField()
    best_store = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingList
        fields = ['id', 'name', 'created_at', 'items', 'total_items', 
                  'best_store', 'total_price', 'progress', 'distance']

    def get_total_items(self, obj) -> int:
        """Calculate total number of items in the list."""
        return obj.shoppinglistitem_set.count()
    
    def get_best_store(self, obj) -> str | None:
        """Find the store with lowest total price for all items."""
        store_totals = {}
        
        for list_item in obj.shoppinglistitem_set.all():
            for store_item in list_item.product.store_items.all():
                store_name = store_item.store.name
                price = float(store_item.price) * list_item.quantity
                store_totals[store_name] = store_totals.get(store_name, 0) + price
        
        if store_totals:
            return min(store_totals, key=store_totals.get)
        return None
    
    def get_total_price(self, obj) -> str | None:
        """Calculate total price at cheapest store for each item."""
        total = 0
        
        for list_item in obj.shoppinglistitem_set.all():
            cheapest = list_item.product.store_items.order_by('price').first()
            if cheapest:
                total += float(cheapest.price) * list_item.quantity
        
        if total > 0:
            return f"{total:.2f}"
        return None
    
    def get_progress(self, obj) -> int:
        """Calculate percentage of items found in stores."""
        total = obj.shoppinglistitem_set.count()
        if total == 0:
            return 0
        
        found = sum(
            1 for item in obj.shoppinglistitem_set.all() 
            if item.product.store_items.exists()
        )
        return int((found / total) * 100)
    
    def get_distance(self, obj) -> str | None:
        """Placeholder for distance calculation."""
        # Would use user location in real implementation
        return None

