'use strict';
const Hash = require('../libs/hash').Hash;

describe('hash-test', (done) => {
    it('Test Sha 256 Hash', (done) => {
      let expectation = `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`;

      let hasher = new Hash();
      let result = hasher.sha256('hello');

      if (result === expectation) {
        done();
      } else {
        done(new Error(`Expected result to equal ${expectation}`));
      }
    });


    it('Test Ip Hash', (done) => {
      let expectation = 4018750999;

      let hasher = new Hash();
      let result = hasher.ipHash([[0, 1], [2, 3], [4, 5]], 985350543);
      console.log(result);
      if (result === expectation) {
        done();
      } else {
        done(new Error(`Expected result to equal ${expectation}`));
      }
    });
});