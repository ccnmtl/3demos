from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/rooms/(?P<room_id>\d+)/$',
            consumers.RoomsConsumer.as_asgi()),
]
