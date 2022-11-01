from django.shortcuts import render


def index(request):
    return render(request, 'index.html')


def room(request, room_id):
    return render(request, 'index.html', {
        'room_id': room_id
    })
