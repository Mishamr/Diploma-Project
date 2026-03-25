"""
API URL configuration.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import monitoring, views, views_auth, views_chains, views_premium

router = DefaultRouter()
router.register(r"products", views.ProductViewSet)
router.register(r"categories", views.CategoryViewSet)
router.register(r"shopping-lists", views.ShoppingListViewSet, basename="shoppinglist")
router.register(r"chains", views_chains.ChainViewSet)

urlpatterns = [
    path("", include(router.urls)),
    # Auth
    path("auth/register/", views_auth.register_view, name="register"),
    path("auth/login/", views_auth.login_view, name="login"),
    path("auth/logout/", views_auth.logout_view, name="logout"),
    path("auth/profile/", views_auth.profile_view, name="profile"),
    path(
        "auth/profile/tickets/", views_auth.update_tickets_view, name="profile-tickets"
    ),
    path("auth/profile/coins/", views_auth.add_coins_view, name="profile-coins"),
    path(
        "auth/profile/store/buy/", views_auth.buy_tickets_view, name="profile-store-buy"
    ),
    path(
        "auth/profile/upgrade-pro/",
        views_auth.upgrade_pro_view,
        name="profile-upgrade-pro",
    ),
    path("auth/google/", views_auth.google_login_view, name="google-auth"),
    # Features
    path("promotions/", views.promotions_view, name="promotions"),
    path("survival/", views.survival_basket_view, name="survival"),
    path(
        "survival/substitute/",
        views.survival_substitute_view,
        name="survival-substitute",
    ),
    path("compare/", views.compare_prices_view, name="compare"),
    path("compare-cart/", views.compare_cart_view, name="compare-cart"),
    # Analytics
    path(
        "analytics/inflation/", views_premium.inflation_analytics_view, name="inflation"
    ),
    path("analytics/price-index/", views_premium.price_index_view, name="price-index"),
    path("analytics/user/", views_premium.user_analytics_view, name="user-analytics"),
    path(
        "analytics/calendar/",
        views_premium.expense_calendar_view,
        name="expense-calendar",
    ),
    # Monitoring
    path("health/", monitoring.health_check, name="health"),
    path("status/", monitoring.scraper_status, name="status"),
    # AI Proxy
    path("ai/chat/", views.ai_chat_view, name="ai-chat"),
]
