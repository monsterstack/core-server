'use strict';
const sha256 = require('sha256');

class Hash {
    constructor() {

    }

    ipHash(ip, seed) {
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
        h ^= h >> 11;
        h += h << 15;
        h %= 2147483648;

        return h >>> 0;
    }

    sha256(text) {
        return sha256(text);
    }
}


// Public
module.exports.Hash = Hash;
