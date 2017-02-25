'use strict';
const ip = require('ip');
const Promise = require('promise');
const EventEmitter = require('events');

class Node extends EventEmitter {

    constructor() {
        super();
    }

    getIp() {
        let p = new Promise((resolve, reject) => {
            let ip = require('ip').address();
            console.log(`HOST IP FROM env is ${process.env.HOST_IP}`)
            if(process.env.HOST_IP)
                ip = process.env.HOST_IP;
            else if(process.env.CONTAINER_ADDR) 
                ip = process.env.CONTAINER_ADDR;
            resolve(ip);
        });
        return p;
    }

    onProxyReady(callback) {
        this.once('proxy.ready', (proxy) => {
            callback(proxy);
        });
    }

    emitProxyReady(proxy) {
        this.emit('proxy.ready', proxy);
    }

    /**
     * Redis Retry strategy
     */
    redisRetryStrategy() {
        return (options) => {
            console.log(options);
            // reconnect after
            return Math.min(options.attempt * 100, 3000);
        }
    }
}

module.exports.Node = Node;