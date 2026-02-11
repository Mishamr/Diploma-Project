from django.urls import path
from apps.geo.views import StoreLocatorView

urlpatterns = [
    path('locate/', StoreLocatorView.as_view(), name='geo_locate'),
]
