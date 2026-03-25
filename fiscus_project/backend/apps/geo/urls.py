"""
Geo URL configuration.
"""

from django.urls import path

from . import views

urlpatterns = [
    path("nearby/", views.nearby_stores_view, name="nearby-stores"),
    path("stores/", views.stores_on_map_view, name="stores-map"),
    path("cheapest-basket/", views.cheapest_basket_view, name="cheapest-basket"),
]
