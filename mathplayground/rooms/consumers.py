import json
from channels.generic.websocket import AsyncWebsocketConsumer
from mathplayground.rooms.scene import RedisScene


class RoomsConsumer(AsyncWebsocketConsumer):
    active_users = {}

    # Send a room_event to everyone updating the active user count.
    async def update_active_users(self, active_user_count, session_key):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'room_event',
                'message': {
                    'updateActiveUsers': active_user_count
                },
                'session_key': session_key,
            }
        )

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = 'room_%s' % self.room_id

        # Add user to room count
        session_key = self.scope['session'].session_key
        if self.room_id not in self.active_users:
            self.active_users[self.room_id] = [session_key]
        elif session_key not in self.active_users[self.room_id]:
            self.active_users[self.room_id].append(session_key)

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # I've pretty much joined the room at this point. Send a
        # message to everyone else with the new user count.
        active_user_count = len(self.active_users[self.room_id])
        await self.update_active_users(active_user_count, session_key)

        await self.accept()

    async def disconnect(self, close_code):
        # Remove user from room count
        session_key = self.scope['session'].session_key
        if self.room_id in self.active_users and \
           session_key in self.active_users[self.room_id]:
            # Remove my session key from the list
            self.active_users[self.room_id] = list(filter(
                lambda x: x != session_key,
                self.active_users[self.room_id]))

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        # Update user count for this room
        active_user_count = len(self.active_users[self.room_id])
        await self.update_active_users(active_user_count, session_key)

    # Receive message from WebSocket
    async def receive(self, text_data):
        session = self.scope['session']
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        if message.get('pollResponse'):
            # Send poll response to everyone
            message['session_key'] = session.session_key
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'room_event',
                    'message': message,
                    'session_key': session.session_key,
                }
            )
            return

        scene = RedisScene(self.room_id)
        state = scene.get_state()

        if message.get('chatMessage'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_event',
                    'message': message,
                    'session_key': session.session_key,
                    'host': state.get('host'),
                }
            )
            return

        # Update new scene state in redis
        if message.get('newObject'):
            obj = message.get('newObject')
            state = scene.append_obj(state, obj)
        elif message.get('removeObject'):
            obj_id = message.get('removeObject', {}).get('uuid')
            state = scene.remove_obj(state, obj_id)
        elif message.get('updateObject'):
            obj = message.get('updateObject', {})
            state = scene.update_obj(state, obj)
        elif message.get('publishScene'):
            new_scene_objs = message.get('publishScene', [])
            state['objects'] = new_scene_objs
        elif message.get('broadcastPoll'):
            new_poll = message.get('broadcastPoll', {})
            state['poll'] = new_poll
        elif message.get('showPollResults'):
            poll_results = message.get('showPollResults', {})
            state['pollResults'] = poll_results
        elif message.get('hidePollResults'):
            state['pollResults'] = None

        scene.save_state(state)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'room_event',
                'message': message,
                'session_key': session.session_key,
            }
        )

    async def room_event(self, event):
        """
        Receive a room event for the room group.

        Room events happen when object state changes, or
        users join or disconnect.
        """
        message = event['message']
        session = self.scope['session']

        # Don't send events to myself.
        # Well, except for the updateActiveUsers event and
        # pollResponse event.
        if ('updateActiveUsers' not in message) and \
           ('pollResponse' not in message) and \
           event.get('session_key') == session.session_key:
            return

        # Send out the update to any room participants
        await self.send(text_data=json.dumps({
            'message': message
        }))

    async def chat_event(self, event):
        """
        Receive a chat event for the room group.
        """
        message = event['message']
        session = self.scope['session']

        # Don't send chat events to myself.
        if event.get('session_key') == session.session_key:
            return

        # Don't receive a chat event if I'm not the host
        if event.get('host') != session.session_key:
            return

        # Send out the update to any room participants
        await self.send(text_data=json.dumps({
            'message': message
        }))
