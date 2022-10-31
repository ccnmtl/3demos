import assert from 'assert';
import {
    joinUrl,
    gcd
} from '../src/utils.js';

describe('joinUrl', function() {
    it('joins two URLs',
       function() {
           assert.equal(
               joinUrl('https://example.org/', './image/path.png'),
               'https://example.org/image/path.png'
           );

           assert.equal(
               joinUrl('https://example.org/media/mathplayground',
                       './fonts/font.json'),
               'https://example.org/media/mathplayground/fonts/font.json'
           );

           assert.equal(
               joinUrl('https://example.org/media/mathplayground/',
                       './fonts/font.json'),
               'https://example.org/media/mathplayground/fonts/font.json'
           );
       });
});

describe('gcd', function() {
    it('should return the greatest common divisor of two numbers',
       function() {
           assert.equal(gcd(10, 100), 10);
           assert.equal(gcd(19048, 235232), 8);
           assert.equal(gcd(7, 5382), 1);
       });
});
