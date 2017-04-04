'use strict';
const Promise = require('promise');

class ProxyCacheService {
  constructor(proxy) {
    this.proxy = proxy;
  }

  cache() {
    let _this = this;

    let promise = null;

    if (_this.proxy) {
      promise = _this.proxy.table();
    } else {
      promise = new Promise((resolve, reject) => { resolve([]); });
    }

    return promise;
  }
}

// Public
module.exports = ProxyCacheService;
