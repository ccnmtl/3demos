import json
from channels.generic.websocket import AsyncWebsocketConsumer
from mathplayground.rooms.scene import RedisScene


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

        scene = RedisScene(self.room_id)
        state = scene.get_state()
        # Update new scene state in redis
        if message.get('newObject'):
            obj = message.get('newObject')
            state = scene.append_obj(state, obj)
        elif message.get('removeObject'):
            obj_id = message.get(
                'removeObject', {}).get('uuid')
            state = scene.remove_obj(state, obj_id)

        scene.save_state(state)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'graph_event',
                'message': message,
                'session_key': session.session_key,
            }
        )

    # Receive message from room group
    async def graph_event(self, event):
        message = event['message']
        session = self.scope['session']

        # Don't send events to myself.
        if event.get('session_key') == session.session_key:
            return

        # Send out the update to any room participants
        await self.send(text_data=json.dumps({
            'message': message
        }))
