from django.contrib import admin
from django.urls import path, include
# Add include logic later
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.api.urls')),
]
