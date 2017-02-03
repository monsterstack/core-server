'use strict';
const glob = require('glob');
const Promise = require('promise');
const config = require('config');
const cors = require('cors');
const express = require('express');
const path = require('path');
const appRoot = require('app-root-path');
const bodyParser = require('body-parser');
const bearerToken = require('express-bearer-token');

const Cluster = require('./libs/cluster').Cluster;

const AuthCheckMiddleware = require('security-middleware').AuthCheckMiddleware;
const RealizationCheckMiddleware = require('discovery-middleware').RealizationCheckMiddleware;

class Server {
  constructor(name, announcement, types, options) {
    this.id = require('node-uuid').v1();
    this.name = name;
    this.announcement = announcement;
    this.types = types || [];

    let useRandomWorkerPort = false;
    let discoveryHost = '0.0.0.0';
    let discoveryPort = 7616;
    let makeAnnouncement = false;

    if(options) {
      useRandomWorkerPort = options.useRandomWorkerPort || false;
      discoveryHost = options.discoveryHost || '0.0.0.0';
      discoveryPort = options.discoveryPort || 7616;
      makeAnnouncement = options.makeAnnouncement || false;
    }

    this.useRandomWorkerPort = useRandomWorkerPort;
    this.discoveryHost = discoveryHost;
    this.discoveryPort = discoveryPort;

    this.makeAnnouncement = makeAnnouncement;

    this.proxyLib = require('discovery-proxy');
    this.boundProxy = null;
  }

  getIo() {
    return this.io;
  }

  getIoRedis() {
    return this.ioRedis;
  }

  getHttp() {
    return this.http;
  }

  getApp() {
    return this.app;
  }

  getMe() {
    let descriptor = {
      type: this.name,
      healthCheckRoute: '/health',
      schemaRoute: '/swagger.json',
      docsPath: this.announcement.docsPath,
      timestamp: new Date(),
      id: this.id,
      region: this.announcement.region,
      stage: this.announcement.stage,
      status: 'Online',
      version: this.announcement.version
    };

    let p = new Promise((resolve, reject) => {
      let ip = require('ip');
      console.log(ip.address());
      descriptor.endpoint = "http://"+ip.address()+":"+config.port
      resolve(descriptor);
    });
    return p;

  }

  init() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      console.log(`Starting ${self.name} on ${config.port}`);
      self.app = require('express')();
      console.log('Assign express');
      self.http = require('http').Server(self.app);
      self.io = require('socket.io')(self.http);
      self.ioredis = require('socket.io-redis');
      console.log('Enabling cors');
      self.app.use(cors());
      self.app.use(bodyParser.urlencoded({ extended: true }));
      self.app.use(bodyParser.json({ type: 'application/json' }));
      self.app.use(bearerToken());

      // parse an HTML body into a string
      self.app.use(bodyParser.text({ type: 'text/html' }));

      self.app.authCheck = new AuthCheckMiddleware(self.app);
      self.app.realizationCheck = new RealizationCheckMiddleware(self.app);

      console.log('Resolve');
      resolve();

    });
    return p;
  }

  listen() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      console.log('Attempt bind on port');

      if(self.useRandomWorkerPort === true) {
        config.port = 0;
      }

      self.http.listen(config.port, () => {
        console.log(`listening on *:${config.port}`);
        resolve();
      });
    });

    return p;

  }

  /**
   * Announce the 'ServiceDescriptor' to the DiscoveryService
   * In a typical local Cluster setup, the cluster master does the announcement.
   * When running a service standalone, the service will be able to announce and query.
   */
  announce(exitHandlerFactory, modelRepository) {
    this.makeAnnouncement = true; /// Not being set in constructor for some reason @TODO: FIX
    if(this.makeAnnouncement === true) {
      if(exitHandlerFactory)
        this._bindCleanUp(exitHandlerFactory, modelRepository);
    }

    if(this.makeAnnouncement === true) {
      let self = this;
      // Dispatch Proxy -- init / announce
      this.getMe().then((me) => {
        console.log(me);
        console.log(`http://${this.discoveryHost}:${this.discoveryPort}`);
        this.proxyLib.connect({addr:`http://${this.discoveryHost}:${this.discoveryPort}`}, (err, p) => {
          p.bind({ descriptor: me, types: self.types });
          self.boundProxy = p;
          self.app.proxy = p;
          self.app.dependencies = self.types;
        });
      }).catch((err) => {
        console.log(err);
      });
    }
  }

  /**
   * Perform streaming query against Discovery Service
   * Note that no announcement occurs.
   *
   * Strategy behind this method is that in a local Cluster, the master
   * will announce and all the workers will query.  This will result in 'n'
   * worker streaming query connections to the Discovery Service and only One
   * announcement of a 'ServiceDescriptor' representing all the workers.
   *
   * Remember all access to a 'worker' runs through the master port binding.
   */
  query(exitHandlerFactory, modelRepository) {
    let self = this;
    // Dispatch Proxy -- init / announce
    this.getMe().then((me) => {
      console.log(me);
      console.log(`http://${this.discoveryHost}:${this.discoveryPort}`);
      this.proxyLib.connect({addr:`http://${this.discoveryHost}:${this.discoveryPort}`}, (err, p) => {
        p.bind({ types: self.types });
        self.boundProxy = p;
        self.app.proxy = p;
        self.app.dependencies = self.types;
      });
    }).catch((err) => {
      console.log(err);
    });
  }

  loadHttpRoutes() {
    console.log("Loading Http Routes");
    glob(appRoot.path + "/api/v1/routes/*.routes.js", {}, (err, files) => {
      files.forEach((file) => {
        require(file)(this.app);
      });
    });

    glob(appRoot.path + "/app/routes/*.routes.js", {}, (err, files) => {
      files.forEach((file) => {
        require(file)(this.app);
      });
    });
  }

  /**
   * Cleanup handler
   * Perform any necessary cleanup for the server on exit.
   */
  _bindCleanUp(exitHandlerFactory, modelRepository) {
    process.stdin.resume();//so the program will not close instantly

    // Exit handler
    let exitHandler = exitHandlerFactory(this.id, modelRepository);

    //do something when app is closing
    process.on('exit', exitHandler.bind(null,{cleanup:true}));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {cleanup:true}));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));
  }

}


module.exports.ServiceError = require('./errors/error');
module.exports.HealthService = require('./services/healthService');
module.exports.SwaggerService = require('./services/swaggerService');
module.exports.ProxyCacheService = require('./services/proxyCacheService');
module.exports.Cluster = Cluster;
module.exports.Server = Server;
