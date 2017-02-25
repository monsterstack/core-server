'use strict';
const Node = require('../libs/node.js').Node;

/**
 * Node Test
 */
describe('node-service', (done) => {
    let node = null;
    before((done) => {
        node = new Node();
        done();
    });

    it('Node Ip is valid', (done) => {
        node.getIp().then((ip) => {
            if(ip) {
                console.log(ip);
                done();
            } else {
                done(new Error("Missing Ip"));
            }
        }).catch((err) => {
            done(err);
        })
    });

    after((done) => {
        done();
    });
});