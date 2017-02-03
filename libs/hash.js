'use strict';

/**
 * Create a Hash based on ip address and seed.
 * @TODO: Move to Common Libs
 */
const hash = (ip, seed) => {
  let h = ip.reduce((r, num) => {
        r += parseInt(num, 10);
        r %= 2147483648;
        r += (r << 10)
        r %= 2147483648;
        r ^= r >> 6;
        return r;
    }, seed);

    h += h << 3;
    h %= 2147483648;
    h ^= hash >> 11;
    h += hash << 15;
    h %= 2147483648;

    return h >>> 0;
}

// Public
module.exports = hash;
