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
});
