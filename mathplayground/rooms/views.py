from django.shortcuts import render
from django.views.generic import TemplateView
from mathplayground.rooms.scene import RedisScene


def index(request):
    return render(request, 'index.html')


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


class RoomAdminView(TemplateView):
    template_name = 'admin.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        room_id = kwargs.get('room_id')
        context['room_id'] = room_id
        return context
