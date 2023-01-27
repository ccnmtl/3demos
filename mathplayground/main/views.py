from django.shortcuts import render
from django.conf import settings


# Create your views here.
def index(request):
    context = {}
    if hasattr(settings, 'GA_CODE'):
        context['GA_CODE'] = settings.GA_CODE

    return render(request, 'index.html', context)
