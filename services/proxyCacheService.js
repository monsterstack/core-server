'use strict';
const Promise = require('promise');

class ProxyCacheService {
  constructor(proxy) {
    this.proxy = proxy;
  }

  cache() {
    return this.proxy.table();
  }
}

// Public
module.exports = ProxyCacheService;
