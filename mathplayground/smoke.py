from smoketest import SmokeTest
from importlib import import_module
from django.conf import settings


class SessionConnectivity(SmokeTest):
    def test_session_connection(self):
        SessionStore = import_module(settings.SESSION_ENGINE).SessionStore
        ss = SessionStore()
        self.assertFalse(ss.exists(None))
