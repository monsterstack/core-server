'use strict';
const sha256 = require('sha256');

/**
 * Hash
 */
class Hash {
  constructor() {
    this.sha256 = sha256;
  }

  /**
   * Create Ip Hash
   * @param ip {Array}
   * @param seed {Number}
   * @returns {Number}
   */
  ipHash(ip, seed) {
    let h = ip.reduce((r, num) => {
      r += parseInt(num, 10);
      r %= 2147483648;
      r += (r << 10);
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

  /**
    * Create Sha 256 Hash
    * @param text {String}
    * @returns {String}
    */
  sha256(text) {
    return sha256(text);
  }
}

// Public
module.exports.Hash = Hash;
