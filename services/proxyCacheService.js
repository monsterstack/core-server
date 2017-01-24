'use strict';
const Promise = require('promise');

class ProxyCacheService {
  constructor(proxy) {
    this.proxy = proxy;
  }

  cache() {
    if(this.proxy) console.log(this.proxy);
    return this.proxy.table();
  }
}

// Public
module.exports = ProxyCacheService;
