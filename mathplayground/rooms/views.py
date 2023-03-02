from django.shortcuts import render
from mathplayground.rooms.scene import RedisScene


def room(request, room_id):
    # Make sure the user's session is created.
    if not request.session.session_key:
        request.session.create()

    scene = RedisScene(room_id)
    state = scene.get_state(False)

    return render(request, 'index.html', {
        'room_id': room_id,
        'scene_state': state,
    })
