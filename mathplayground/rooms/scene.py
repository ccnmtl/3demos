import json
import redis
from django.conf import settings
from django.utils.encoding import smart_str


SCENE_PREFIX = 'mathplayground:scene:'


class RedisScene:
    def __init__(self, room_id):
        self.room_id = room_id

        # Connect to the same redis instance we're using for the
        # channels layer, just with a different prefix so things don't
        # interfere.
        redis_server = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0]
        host = redis_server[0]
        port = redis_server[1]
        self.r = redis.Redis(host=host, port=port)

    def save_state(self, state):
        key = '{}{}'.format(SCENE_PREFIX, self.room_id)
        self.r.set(key, json.dumps(state))

    def get_state(self, parse_json=True):
        key = '{}{}'.format(SCENE_PREFIX, self.room_id)

        state = self.r.get(key)
        if not state:
            # Initial state
            state = '{"objects": []}'

        if not parse_json:
            return smart_str(state)

        return json.loads(state)

    @staticmethod
    def append_obj(state, obj):
        """
        Given current scene state, append the given object to it.

        Returns the new state.
        """
        try:
            objects = state.get('objects', [])
        except AttributeError:
            # If the state is formatted wrong for some reason, just
            # initialize it to empty.
            objects = []

        objects.append(obj)
        state['objects'] = objects
        return state

    @staticmethod
    def remove_obj(state, obj_id):
        """
        Given current scene state, remove the given object.

        Returns the new state.
        """
        try:
            objects = state.get('objects', [])
        except AttributeError:
            # If the state is formatted wrong for some reason, just
            # initialize it to empty.
            state['objects'] = []
            return objects

        state['objects'] = list(filter(
            lambda x: x.get('uuid') != obj_id,
            objects))
        return state

    @staticmethod
    def update_obj(state, obj):
        """
        Given current scene state, update the given object.

        Returns the new state.
        """
        try:
            objects = state.get('objects', [])
        except AttributeError:
            # If the state is formatted wrong for some reason, just
            # initialize it to empty.
            objects = []

        # Remove old object with this uuid
        objects = list(filter(
                lambda x: x.get('uuid') != obj.get('uuid'),
                objects))
        # Append updated object
        objects.append(obj)

        state['objects'] = objects
        return state
