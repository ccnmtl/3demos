from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('<int:room_id>/', views.room, name='room'),
    path('<int:room_id>/admin',
         views.RoomAdminView.as_view(),
         name='room_admin'),
]
