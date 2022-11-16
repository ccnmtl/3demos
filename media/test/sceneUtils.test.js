import assert from 'assert';
import {handleSceneEvent} from '../src/sceneUtils.js';

describe('handleSceneEvent', function() {
    it('should handle adding a level surface to an empty scene',
       function() {
           const objects = handleSceneEvent({
               message: {
                   newObject: {
                       uuid: 'test-uuid',
                       kind: 'level',
                       params: {
                           g: 'x^2 + 2 y^2 - z^2',
                           k: '1',
                           a: '-2',
                           b: '2',
                           c: '-2',
                           d: '2',
                           e: '-2',
                           f: '2',
                       }
                   }
               }
           }, []);

           assert.equal(objects.length, 1);
           const level = objects[0];
           assert.equal(level.uuid, 'test-uuid');
       });

    it('should handle updating an object',
       function() {
           const objects = handleSceneEvent({
               message: {
                   updateObject: {
                       uuid: 'test-uuid1',
                       kind: 'level',
                       params: {
                           g: 'x^2 + 2 y^2 - z^2',
                           k: '1',
                           a: '-2',
                           b: '2',
                           c: '-2',
                           d: '2',
                           e: '-2',
                           f: '2',
                       }
                   }
               }
           }, [
               {
                   uuid: 'test-uuid1',
                   kind: 'level',
                   params: {
                       g: 'x^3 + 3 y^3 - z^3',
                       k: '1',
                       a: '-3',
                       b: '3',
                       c: '-3',
                       d: '3',
                       e: '-3',
                       f: '3',
                   }
               },
               {
                   uuid: 'test-uuid2',
                   kind: 'level',
                   params: {
                       g: 'x^4 + 4 y^4 - z^4',
                       k: '1',
                       a: '-4',
                       b: '4',
                       c: '-4',
                       d: '4',
                       e: '-4',
                       f: '4',
                   }
               }
           ]);

           assert.equal(objects.length, 2);
           const level = objects.find((x) => x.uuid === 'test-uuid1');
           assert.equal(level.uuid, 'test-uuid1');
           assert.equal(level.kind, 'level');

           assert.deepEqual(level.params, {
               g: 'x^2 + 2 y^2 - z^2',
               k: '1',
               a: '-2',
               b: '2',
               c: '-2',
               d: '2',
               e: '-2',
               f: '2'
           });
       });
});
