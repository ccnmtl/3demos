from django.test import TestCase


class BasicTest(TestCase):
    def test_root(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_smoketest(self):
        response = self.client.get('/smoketest/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'PASS')
