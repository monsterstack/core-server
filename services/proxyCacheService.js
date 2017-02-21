'use strict';
const Promise = require('promise');

class ProxyCacheService {
  constructor(proxy) {
    this.proxy = proxy;
  }

  cache() {
    let self = this;

    let promise = null;

    if(self.proxy) {
      promise = self.proxy.table();
    } else {
      promise = new Promise((resolve, reject) => { resolve([])});
    }

    return promise;
  }
}

// Public
module.exports = ProxyCacheService;
