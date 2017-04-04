'use strict';
const ip = require('ip');
const Promise = require('promise');
const EventEmitter = require('events');

/**
 * Base Node
 */
class Node extends EventEmitter {

  constructor() {
    super();
  }

  /**
    * Get Ip
    * @returns {Promise}
    */
  getIp() {
    let p = new Promise((resolve, reject) => {
      let ip = require('ip').address();
      if (process.env.HOST_IP)
        ip = process.env.HOST_IP;
      else if (process.env.CONTAINER_ADDR)
        ip = process.env.CONTAINER_ADDR;
      resolve(ip);
    });
    return p;
  }

  /**
    * Is part of child process?
    * @returns {Boolean}
    */
  isPartOfChildProcess() {
    if (process.send === undefined) {
      return false;
    } else {
      return true;
    }
  }

  /**
    * On Proxy Ready
    * @param callback {Function}
    * @returns {Object} - Proxy via callback
    */
  onProxyReady(callback) {
    this.once('proxy.ready', (proxy) => {
      callback(proxy);
    });
  }

  /**
    * Emit Proxy Ready
    * @param proxy {Object}
    * @returns {Void}
    */
  emitProxyReady(proxy) {
    this.emit('proxy.ready', proxy);
  }

  /**
    * Redis Retry strategy
    * @returns {Function} - Redis Strategy
    */
  redisRetryStrategy() {
    return (options) => {
      console.log(options);

      // reconnect after
      return Math.min(options.attempt * 100, 3000);
    };
  }
}

module.exports.Node = Node;
