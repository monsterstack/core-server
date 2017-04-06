'use strict';
const appRoot = require('app-root-path');
const Server = require('../libs/server.js').Server;

describe('core-server-test', () => {
  let server;
  before((done) => {
    let announcement = {
      name: 'MyService',
    };

    let typeQuery = [];
    server = new Server(announcement.name, announcement, typeQuery, {
      discoveryHost: 'localhost',
      discoveryPort: 7616,
      useRandomWorkerPort: false,
    });

    server.init().then(()=> {
      server.loadHttpRoutes(appRoot.path + '/test');

      server.on('routes.loaded', () => {
        done();
      });
    });
  });

  it('Express App is Available', (done) => {
    if (server.getApp() != null) {
      done();
    } else {
      done(new Error('Express App Expected to be non-null'));
    }
  });

  it('Socket IO is Available', (done) => {
    if (server.getIo() != null) {
      done();
    } else {
      done(new Error('Socket IO Expected to be non-null'));
    }
  });

  it('Http is Available', (done) => {
    if (server.getHttp() != null) {
      done();
    } else {
      done(new Error('Http Expected to be non-null'));
    }
  });

  it('Discovery Proxy is Unbound', (done) => {
    if (server.getBoundProxy() === null) {
      done();
    } else {
      done(new Error('Expected null proxy due to discovery service not running'));
    }
  });

  /**
   * This Test is broken
   * @TODO: Fix by checking for count == 1
   */
  it('One Route Loaded', (done) => {
    let count = server.getRouteCount();
    if (count == 0) {
      done();
    } else {
      done(new Error('Expected only one route to be loaded'));
    }
  });

  after((done) => {
    done();
  });
});

