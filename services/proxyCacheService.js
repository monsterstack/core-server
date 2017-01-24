'use strict';
const Promise = require('promise');

class ProxyCacheService {
  constructor(proxy) {
    this.proxy = proxy;
  }

  cache() {
    let p = new Promise((resolve, reject) => {
      if(self.proxy) {
        self.proxy.table().then((cache) => {
          resolve(cache);
        }).catch((err) => {
          reject(err);
        });
      }
    });
    return p;
  }
}

// Public
module.exports = ProxyCacheService;
