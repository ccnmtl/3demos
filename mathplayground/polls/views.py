from django.shortcuts import render


def index(request):
    return render(request, 'index.html')


def room(request, poll_id):
    return render(request, 'index.html', {
        'poll_id': poll_id
    })
