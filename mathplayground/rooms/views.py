from django.shortcuts import render


def index(request):
    return render(request, 'index.html')


def room(request, room_id):
    # Make sure the user's session is created.
    # TODO: is this really necessary? This should be happening
    # automatically.
    if not request.session.session_key:
        request.session.create()

    return render(request, 'index.html', {
        'room_id': room_id
    })
