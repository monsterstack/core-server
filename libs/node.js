'use strict';
const EventEmitter = require('events');

class Node extends EventEmitter {

    constructor() {
        super();
    }

    onProxyReady(callback) {
        let cb = once(callback);
        this.on('proxy.ready', (proxy) => {
            cb(proxy);
        });
    }

    _emitProxyReady(proxy) {
        this.emit('proxy.ready', proxy);
    }

    /**
     * Redis Retry strategy
     */
    _redisRetryStrategy() {
        return (options) => {
            console.log(options);
            // reconnect after
            return Math.min(options.attempt * 100, 3000);
        }
    }
}

module.exports.Node = Node;