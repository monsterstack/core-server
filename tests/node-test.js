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
      if (ip) {
        done();
      } else {
        done(new Error('Missing Ip'));
      }
    }).catch((err) => {
      done(err);
    });
  });

  it('Node Detect being part of child process', (done) => {
    let isPartOfChildProcess = node.isPartOfChildProcess();

    if (isPartOfChildProcess)
      done(new Error('Expecting to `not` be part of child process'));
    else {
      done();
    }
  });

  after((done) => {
    done();
  });
});
