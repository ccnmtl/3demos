import json
from channels.generic.websocket import AsyncWebsocketConsumer


class RoomsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = 'room_%s' % self.room_id

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        session = self.scope['session']
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'session_key': session.session_key,
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        session = self.scope['session']

        # Don't send events to myself.
        if event.get('session_key') == session.session_key:
            return

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))
