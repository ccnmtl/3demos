from django.test import TestCase
from mathplayground.rooms.scene import RedisScene


class SceneTest(TestCase):
    def test_append_obj(self):
        state = RedisScene.append_obj({}, {
            'uuid': '2cc5d23b-5661-4240-936a-ad9e6341c71b',
            'test': 123,
            'attr2': 'abc',
        })
        self.assertEqual(state, {
            'objects': [{
                'uuid': '2cc5d23b-5661-4240-936a-ad9e6341c71b',
                'test': 123,
                'attr2': 'abc',
            }]
        })

    def test_remove_obj(self):
        state = RedisScene.append_obj({}, {
            'uuid': '2cc5d23b-5661-4240-936a-ad9e6341c71b',
            'test': 123,
            'attr2': 'abc',
        })
        state = RedisScene.append_obj(state, {
            'uuid': '35723985-5661-4240-936a-ad9e6341c71b',
            'test': 234,
            'attr2': 'def',
        })

        state = RedisScene.remove_obj(
            state, '35723985-5661-4240-936a-ad9e6341c71b')

        self.assertEqual(state, {
            'objects': [{
                'uuid': '2cc5d23b-5661-4240-936a-ad9e6341c71b',
                'test': 123,
                'attr2': 'abc',
            }]
        })

    def test_update_obj(self):
        state = RedisScene.append_obj({}, {
            'uuid': '2cc5d23b-5661-4240-936a-ad9e6341c71b',
            'test': 123,
            'attr2': 'abc',
        })
        state = RedisScene.append_obj(state, {
            'uuid': '35723985-5661-4240-936a-ad9e6341c71b',
            'test': 234,
            'attr2': 'def',
        })

        state = RedisScene.update_obj(state, {
            'uuid': '35723985-5661-4240-936a-ad9e6341c71b',
            'test': 234,
            'attr2': 'newVal',
        })

        self.assertEqual(len(state.get('objects')), 2)

        updated_obj = [
            x for x in state.get('objects')
            if x.get('uuid') == '35723985-5661-4240-936a-ad9e6341c71b'
        ][0]
        self.assertEqual(updated_obj, {
            'uuid': '35723985-5661-4240-936a-ad9e6341c71b',
            'test': 234,
            'attr2': 'newVal',
        })

        other_obj = [
            x for x in state.get('objects')
            if x.get('uuid') == '2cc5d23b-5661-4240-936a-ad9e6341c71b'
        ][0]
        self.assertEqual(other_obj, {
            'uuid': '2cc5d23b-5661-4240-936a-ad9e6341c71b',
            'test': 123,
            'attr2': 'abc',
        })
