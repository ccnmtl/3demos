import assert from 'assert';
import {makePoll} from '../src/pollUtils.js';

describe('makePoll', function() {
    it('should make a valid poll',
       function() {
           const poll = makePoll([]);

           assert.equal(poll.id, 1);
           assert.equal(poll.type, 0);
           assert.equal(poll.prompt, '');
           assert.equal(poll.choices, null);
       });
});
