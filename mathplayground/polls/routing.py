from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/polls/(?P<poll_id>\d+)/$',
            consumers.PollsConsumer.as_asgi()),
]
