"""
URL configuration for Fiscus API.

This module defines all API routes for the application,
including product, store, shopping list, and premium endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from apps.api.views import (
    ProductViewSet,
    StoreViewSet,
    ShoppingListViewSet,
    ComparisonViewSet,
    PromotionsViewSet,
    StatusView,
    DashboardStatsView,
    PromotionsStoreListView,
    StorePromotionsView,
)
from apps.api.views_premium import SurvivalView, PriceHistoryView
from apps.api.views_auth import RegisterView, UserProfileView

# Configure router for viewsets
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'stores', StoreViewSet, basename='store')
router.register(r'shopping-lists', ShoppingListViewSet, basename='shopping-list')
router.register(r'comparison', ComparisonViewSet, basename='comparison')
router.register(r'promotions', PromotionsViewSet, basename='promotions')

# URL patterns
urlpatterns = [
    # Router URLs (products, stores, shopping-lists, comparison)
    path('', include(router.urls)),
    
    # JWT Authentication
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User Management
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/profile/', UserProfileView.as_view(), name='auth_profile'),
    
    # Status endpoint
    path('status/', StatusView.as_view(), name='status'),
    
    # Dashboard stats
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
    
    # Premium endpoints
    path('premium/survival/', SurvivalView.as_view(), name='premium_survival'),
    path(
        'premium/history/<int:product_id>/',
        PriceHistoryView.as_view(),
        name='premium_history'
    ),
    
    # Store Promotions - NEW
    path('promotions/stores/', PromotionsStoreListView.as_view(), name='promotions_stores'),
    path('promotions/<str:store_id>/', StorePromotionsView.as_view(), name='store_promotions'),
    
    # Geo-location endpoints
    path('geo/', include('apps.geo.urls')),
]

