'use strict';
const Promise = require('promise');

class ProxyCacheService {
  constructor(proxy) {
    this.proxy = proxy;
  }

  cache() {
    let p = new Promise((resolve, reject) => {
      if(self.proxy) {
        console.log('Fetching cache from proxy table');
        self.proxy.table().then((cache) => {
          resolve(cache);
        }).catch((err) => {
          reject(err);
        });
      } else {
        // Nothing
        console.log("------- No Proxy");
        resolve([]);
      }
    });
    return p;
  }
}

// Public
module.exports = ProxyCacheService;
