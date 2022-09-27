import assert from 'assert';
import {gcd} from '../src/utils.js';

describe('gcd', function() {
    it('should return the greatest common divisor of two numbers',
       function() {
           assert.equal(gcd(10, 100), 10);
           assert.equal(gcd(19048, 235232), 8);
           assert.equal(gcd(7, 5382), 1);
       });
});
