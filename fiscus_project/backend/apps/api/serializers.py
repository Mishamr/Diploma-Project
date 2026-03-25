"""
API serializers for Fiscus models.
"""

from django.contrib.auth.models import User

from apps.core.models import (
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
from rest_framework import serializers


class ChainSerializer(serializers.ModelSerializer):
    store_count = serializers.SerializerMethodField()

    class Meta:
        model = Chain
        fields = [
            "id",
            "name",
            "slug",
            "logo_url",
            "website",
            "scraper_type",
            "is_active",
            "store_count",
        ]

    def get_store_count(self, obj):
        return obj.stores.count()


class StoreSerializer(serializers.ModelSerializer):
    chain_name = serializers.CharField(source="chain.name", read_only=True)
    chain_slug = serializers.CharField(source="chain.slug", read_only=True)

    class Meta:
        model = Store
        fields = [
            "id",
            "name",
            "address",
            "city",
            "latitude",
            "longitude",
            "chain_name",
            "chain_slug",
        ]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name", read_only=True, default=""
    )
    latest_price = serializers.SerializerMethodField()
    latest_old_price = serializers.SerializerMethodField()
    image_url = serializers.CharField(source="best_image_url", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "brand",
            "weight",
            "weight_kg",
            "unit",
            "category",
            "category_name",
            "image_url",
            "latest_price",
            "latest_old_price",
        ]

    def get_latest_price(self, obj):
        qs = Price.objects.filter(store_item__product=obj)
        request = self.context.get("request")
        if request and request.query_params.get("chain"):
            qs = qs.filter(
                store_item__store__chain__slug=request.query_params.get("chain")
            )

        latest_price = qs.order_by("-recorded_at").first()
        return float(latest_price.price) if latest_price else None

    def get_latest_old_price(self, obj):
        qs = Price.objects.filter(store_item__product=obj)
        request = self.context.get("request")
        if request and request.query_params.get("chain"):
            qs = qs.filter(
                store_item__store__chain__slug=request.query_params.get("chain")
            )

        latest_price = qs.order_by("-recorded_at").first()
        return (
            float(latest_price.old_price)
            if latest_price and latest_price.old_price
            else None
        )


class PriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Price
        fields = [
            "id",
            "price",
            "old_price",
            "is_promo",
            "promo_label",
            "discount_pct",
            "recorded_at",
        ]


class StoreItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    store = StoreSerializer(read_only=True)
    latest_price = serializers.SerializerMethodField()

    class Meta:
        model = StoreItem
        fields = ["id", "product", "store", "in_stock", "latest_price", "last_scraped"]

    def get_latest_price(self, obj):
        price = obj.prices.order_by("-recorded_at").first()
        if price:
            return PriceSerializer(price).data
        return None


class ProductWithPricesSerializer(serializers.ModelSerializer):
    """Product with latest prices across all stores."""

    category_name = serializers.CharField(
        source="category.name", read_only=True, default=""
    )
    prices = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "brand",
            "weight",
            "weight_kg",
            "unit",
            "category_name",
            "image_url",
            "prices",
        ]

    def get_prices(self, obj):
        store_items = obj.store_items.filter(in_stock=True).select_related(
            "store__chain"
        )
        result = []
        for si in store_items:
            latest = si.prices.order_by("-recorded_at").first()
            if latest:
                result.append(
                    {
                        "chain": si.store.chain.name,
                        "chain_slug": si.store.chain.slug,
                        "store": si.store.name,
                        "price": float(latest.price),
                        "old_price": (
                            float(latest.old_price) if latest.old_price else None
                        ),
                        "is_promo": latest.is_promo,
                        "recorded_at": latest.recorded_at.isoformat(),
                    }
                )
        return sorted(result, key=lambda x: x["price"])


class ShoppingListItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )

    class Meta:
        model = ShoppingListItem
        fields = [
            "id",
            "product",
            "product_name",
            "custom_name",
            "quantity",
            "is_checked",
        ]


class ShoppingListSerializer(serializers.ModelSerializer):
    items = ShoppingListItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingList
        fields = ["id", "name", "items", "total_items", "created_at", "updated_at"]

    def get_total_items(self, obj):
        return obj.items.count()


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "username",
            "city",
            "family_size",
            "monthly_budget",
            "preferred_chains",
            "ai_custom_name",
            "ai_allergies",
            "ai_instructions",
            "tickets",
            "coins",
            "is_pro",
        ]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Користувач з таким ім'ям вже існує")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        UserProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
