from django.urls import path

from mathplayground.main.views import index
from . import views


urlpatterns = [
    path('', index, name='index'),
    path('<int:room_id>/', views.room, name='room'),
]
