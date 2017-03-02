'use strict';
const glob = require('multi-glob').glob;
const Promise = require('promise');
const config = require('config');
const stash = require('stash');
const cors = require('cors');
const express = require('express');
const path = require('path');
const appRoot = require('app-root-path');
const bodyParser = require('body-parser');
const responseTime = require('response-time');
const bearerToken = require('express-bearer-token');
const Node = require('./node').Node;

const AuthCheckMiddleware = require('security-middleware').AuthCheckMiddleware;
const RealizationCheckMiddleware = require('discovery-middleware').RealizationCheckMiddleware;

const CircuitBreakerMiddleware = require('../middleware/circuitBreaker').CircuitBreakerMiddleware;

class Server extends Node {
  constructor(name, announcement, types, options) {
    super();    
    this.id = require('node-uuid').v1();
    this.name = name;
    this.announcement = announcement;
    this.types = types || [];

    let useRandomWorkerPort = false;
    let discoveryHost = config.discovery.host;
    let discoveryPort = config.discovery.port;
    let makeAnnouncement = false;

    this.circuitBreaker = new CircuitBreakerMiddleware({
      maxFailureAllowed: 5
    });

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

    let p = this.getIp().then((ip) => {
      descriptor.endpoint = "http://"+ip+":"+config.port
      return descriptor;
    });
    return p;
  }

  init() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      self.app = require('express')();
      console.log('Assign express');
      self.http = require('http').Server(self.app);
      self.io = require('socket.io')(self.http);
      self.ioredis = require('socket.io-redis');

      self.app.stash = (level, message) => {
        stash.send({
          '@timestamp': new Date(),
          'message': message,
          'level': level
        });
      };

      console.log('Enabling cors');
      self.app.use(cors());
      self.app.use(bodyParser.urlencoded({ extended: true }));
      self.app.use(bodyParser.json({ type: 'application/json' }));
      self.app.use(bearerToken());

      // Clustered Socket IO using Redis
      // This is used to support multiple Servers in a Cluster.
      // Support broadcasting to all client connections, not just the
      // ones connected to this instance.
      self.io.adapter(self.ioredis({
        host: config.redis.host,
        port: config.redis.port,
        retry_strategy: self.redisRetryStrategy()
      }));

      // Authorization of Client Connection
      // authSetup(io, {
      //   authenticate: (socket, data, callback) => {
      //       callback(null, true);
      //   }
      // });

      // parse an HTML body into a string
      self.app.use(bodyParser.text({ type: 'text/html' }));
      console.log("Intializing Middleware")
      self.app.use(self.circuitBreaker.inboundMiddleware(self.app));
      self.app.authCheck = new AuthCheckMiddleware(self.app);
      self.app.realizationCheck = new RealizationCheckMiddleware(self.app);


      // Response Time Middleware
      self.app.use(responseTime({ suffix: false, digits: 1 }, (req, res, time) => {
        let metric = {
          serviceId: self.id,
          type: 'response.time',
          value: time
        };
        if(app.proxy)
          app.proxy.sendResponseTimeMetric(metric);
      }));

      self.getIp().then((ip) => {
        if(ip)
          self.app.listeningIp = ip;
      }).catch((err) => {
        console.log('Failed to get ip');
      });

      console.log('Resolve');

      resolve();

    });
    return p;
  }

  listen() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      console.log('Attempt bind on port');
      let portNum = config.port;
      if(self.useRandomWorkerPort === true) {
        portNum = 0;
      }

      console.log(`Starting ${self.name} on ${portNum}`);
      self.http.listen(portNum, () => {
        console.log(`listening on *:${portNum}`);
        self.app.listeningPort = self.http.address().port;
        resolve();
      });


      // Listen to messages sent from the master. Ignore everything else.
      process.on('message', (message, connection) => {
        if (typeof message === "object" && message.hasOwnProperty("id")) {
            self.id = message.id;
            return;
        } else if (message !== 'sticky-session:connection') {
            return;
        } 

        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        self.http.emit('connection', connection);

        connection.resume();
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
      // Discovery Proxy -- init / announce
      this.getMe().then((me) => {
        console.log(me);
        console.log(`http://${this.discoveryHost}:${this.discoveryPort}`);
        this.proxyLib.connect({addr:`http://${this.discoveryHost}:${this.discoveryPort}`}, (err, p) => {
          p.bind({ descriptor: me, types: self.types });
          self.boundProxy = p;
          self.app.proxy = p;
          self.app.dependencies = self.types;

          self.emitProxyReady(p);
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
    if(exitHandlerFactory)
      this._bindCleanUp(exitHandlerFactory, modelRepository);
    console.log(`http://${this.discoveryHost}:${this.discoveryPort}`);
    this.proxyLib.connect({addr:`http://${this.discoveryHost}:${this.discoveryPort}`}, (err, p) => {
        p.bind({ types: self.types });
        self.boundProxy = p;
        self.app.proxy = p;
        self.app.dependencies = self.types;

        self.emitProxyReady(p);
     });
  }

  /**
   * Load Http Routes
   * Scan all Routes in service and attach them to the express app.
   */
  loadHttpRoutes() {
    console.log("Loading Http Routes");
    let self = this;
    glob([appRoot.path + "/api/v1/routes/*.routes.js",appRoot.path + "/app/routes/*.routes.js"] , {}, (err, files) => {
      for(let f in files) {
        require(files[f])(self.app);
      }

      // Last Middleware -- @TODO - Allow the passing in of a function to load additional outbound Middleware
      self.app.use(self.circuitBreaker.outboundMiddleware(self.app));
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

// Public
module.exports.Server = Server;
