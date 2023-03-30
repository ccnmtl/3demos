from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.urls import reverse
from mathplayground.rooms.scene import make_room


@require_http_methods(['GET', 'POST'])
def index(request):
    if request.method == 'POST':
        # Make sure the user's session is created.
        if not request.session.session_key:
            request.session.create()

        data = request.POST
        room_id = make_room(
            data.get('objects'),
            request.session.session_key)

        return HttpResponseRedirect(
            reverse('room', args=[room_id]))

    return render(request, 'index.html')
