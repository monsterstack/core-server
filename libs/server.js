'use strict';
const debug = require('debug')('core-server');

const glob = require('multi-glob').glob;
const Promise = require('promise');
const config = require('config');
const stash = require('stash');
const cors = require('cors');
const compression = require('compression');
const express = require('express');
const path = require('path');
const appRoot = require('app-root-path');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const bearerToken = require('express-bearer-token');
const Node = require('./node').Node;
const expressMetrics = require('express-metrics');
const addRequestIdMiddleware = require('express-request-id');

const sm = require('security-middleware');
const dm = require('discovery-middleware');
const tm = require('tenant-middleware');

const cim = require('./middleware/containerIdentifier');
const cbm = require('./middleware/circuitBreaker');
const rtm = require('./middleware/responseTime');

const ApplicationContextMiddleware = require('app-context').ApplicationContextMiddleware;

const AuthCheckMiddleware = sm.AuthCheckMiddleware;
const RealizationCheckMiddleware = dm.RealizationCheckMiddleware;
const CircuitBreakerMiddleware = cbm.CircuitBreakerMiddleware;
const ContainerIdentifierMiddleware = cim.ContainerIdentifierMiddleware;
const ResponseTimeMiddleware = rtm.ResponseTimeMiddleware;
const TenantDbCreationMiddleware = tm.TenantDBCreationMiddleware;

class Server extends Node {
  /**
   * Create Server
   * @param {String} - name
   * @param {Object} - announcement
   * @param {[String]} - types
   * @param {Object} - options
   */
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
      maxFailureAllowed: 5,
    });

    this.applicationContext = new ApplicationContextMiddleware();

    this.containerIdentifier = new ContainerIdentifierMiddleware();

    if (options) {
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

    this.routeCount = 0;

  }

  /**
   * Get Bound Proxy
   * @returns {Object} - DiscoveryProxy
   */
  getBoundProxy() {
    return this.boundProxy;
  }

  /**
   * Get Route Count
   * @returns {Number} - number of loaded routes
   */
  getRouteCount() {
    return this.routeCount;
  }

  /**
   * Get Io
   * @returns {Object} - IO
   */
  getIo() {
    return this.io;
  }

  /**
   * Get IoRedis
   * @returns {Object} - IoRedis
   */
  getIoRedis() {
    return this.ioRedis;
  }

  /**
   * Get Http
   * @returns {Object} - Http
   */
  getHttp() {
    return this.http;
  }

  /**
   * Get App
   * @returns {App} - Express App
   */
  getApp() {
    return this.app;
  }

  /**
   * Get Me
   * @returns {Promise}
   */
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
      version: this.announcement.version,
    };

    let p = this.getIp().then((ip) => {
      descriptor.endpoint = `http://${ip}:${config.port}`;
      return descriptor;
    });
    return p;
  }

  /**
   * Initialize
   * @returns {Promise}
   */
  init() {
    let _this = this;
    let p = new Promise((resolve, reject) => {
      _this.app = require('express')();
      debug('Assign express');
      _this.http = require('http').Server(_this.app);
      _this.io = require('socket.io')(_this.http);
      _this.ioredis = require('socket.io-redis');

      _this.app.stash = (level, message) => {
        stash.send({
          '@timestamp': new Date(),
          message: message,
          level: level,
        });
      };

      debug('Enabling compression');
      _this.app.use(compression());
      debug('Enabling cors');
      _this.app.use(cors());
      _this.app.use(bodyParser.urlencoded({ extended: true }));
      _this.app.use(bodyParser.json({ type: 'application/json' }));
      _this.app.use(expressValidator());
      _this.app.use(bearerToken());

      // Clustered Socket IO using Redis
      // This is used to support multiple Servers in a Cluster.
      // Support broadcasting to all client connections, not just the
      // ones connected to this instance.
      _this.io.adapter(_this.ioredis({
        host: config.redis.host,
        port: config.redis.port,
        retry_strategy: _this.redisRetryStrategy(),
      }));

      // Authorization of Client Connection
      // authSetup(io, {
      //   authenticate: (socket, data, callback) => {
      //       callback(null, true);
      //   }
      // });

      // parse an HTML body into a string
      _this.app.use(bodyParser.text({ type: 'text/html' }));
      debug('Intializing Middleware');

      _this.app.use(addRequestIdMiddleware());

      _this.app.use(_this.applicationContext.startContext());
      _this.app.use(_this.circuitBreaker.inboundMiddleware(_this.app));
      _this.app.authCheck = new AuthCheckMiddleware(_this.app);
      _this.app.realizationCheck = new RealizationCheckMiddleware(_this.app);
      _this.app.tenantDbCreation = new TenantDbCreationMiddleware(_this.app);

      if (_this.isPartOfChildProcess()) {
        _this.app.use(expressMetrics({
          cluster: true,
        }));
      }

      // Response Time Middleware
      let responseTimeMiddleware = new ResponseTimeMiddleware();
      _this.app.use(responseTimeMiddleware.computeResponseTime((time) => {
        let metric = {
          serviceId: _this.id,
          type: 'response.time',
          value: Math.round(time),
        };
        debug('Response Time Metric ( server route )');
        debug(metric);
        if (_this.app.proxy)
          _this.app.proxy.sendResponseTimeMetric(metric);
      }));

      _this.getIp().then((ip) => {
        if (ip)
          _this.app.listeningIp = ip;
      }).catch((err) => {
        console.error(err);
      });

      resolve();

    });
    return p;
  }

  /**
    * Listen
    * @returns {Promise}
    */
  listen() {
    let _this = this;
    let p = new Promise((resolve, reject) => {
      debug('Attempt bind on port');
      let portNum = config.port;
      if (_this.useRandomWorkerPort === true) {
        portNum = 0;
      }

      debug(`Starting ${_this.name} on ${portNum}`);
      _this.http.listen(portNum, () => {
        debug(`listening on *:${portNum}`);
        _this.app.listeningPort = _this.http.address().port;
        resolve();
      });

      // Listen to messages sent from the master.
      // Ignore everything else.
      process.on('message', (message, connection) => {
        if (typeof message === 'object' && message.hasOwnProperty('id')) {
          _this.id = message.id;
          return;
        } else if (message !== 'sticky-session:connection') {
          return;
        }

        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        _this.http.emit('connection', connection);

        connection.resume();
      });
    });

    return p;

  }

  /**
   * Announce the 'ServiceDescriptor' to the DiscoveryService
   * In a typical local Cluster setup, the cluster master does the announcement.
   * When running a service standalone, the service will be able to announce and query.
   * @param {Object} - ExitHandlerFactory
   * @param {Object} - ModelRepository
   * @returns {Void}
   */
  announce(exitHandlerFactory, modelRepository) {
    let _this = this;

    _this.makeAnnouncement = true; /// Not being set in constructor for some reason @TODO: FIX
    if (_this.makeAnnouncement === true) {
      if (exitHandlerFactory)
        _this._bindCleanUp(exitHandlerFactory, modelRepository);
    }

    if (_this.makeAnnouncement === true) {
      // Discovery Proxy -- init / announce
      this.getMe().then((me) => {
        debug(me);
        debug(`http://${_this.discoveryHost}:${_this.discoveryPort}`);
        let addr = `http://${_this.discoveryHost}:${_this.discoveryPort}`;
        this.proxyLib.connect({ addr: addr }, (err, p) => {
          p.bind({ descriptor: me, types: _this.types });
          _this.boundProxy = p;
          _this.app.proxy = p;
          _this.app.dependencies = _this.types;

          _this.emitProxyReady(p);
        });
      }).catch((err) => {
        console.error(err);
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
   * @param {Object} - ExitHandlerFactory
   * @param {Object} - ModelRepository
   * @returns {Void}
   */
  query(exitHandlerFactory, modelRepository) {
    let _this = this;
    if (exitHandlerFactory)
      _this._bindCleanUp(exitHandlerFactory, modelRepository);
    let addr = `http://${this.discoveryHost}:${this.discoveryPort}`;
    debug(addr);
    _this.proxyLib.connect({ addr: addr }, (err, p) => {
      p.bind({ types: _this.types });
      _this.boundProxy = p;
      _this.app.proxy = p;
      _this.app.dependencies = _this.types;

      _this.emitProxyReady(p);
    });
  }

  /**
   * Load Http Routes
   * Scan all Routes in service and attach them to the express app.
   * @params {String} - optional app root path override
   * @returns {Void}
   */
  loadHttpRoutes(appRootPathOverride) {
    debug('Loading Http Routes');
    let _this = this;
    let rootPath = appRootPathOverride || appRoot.path;
    let apiRoutes = rootPath + '/api/v1/routes/*.routes.js';
    let appRoutes = rootPath + '/app/routes/*.routes.js';

    glob([
        apiRoutes,
        appRoutes,
      ], {}, (err, files) => {
      for (let f in files) {
        require(files[f])(_this.app);
      }

      _this.routeCount = files.length;
      _this.emit('routes.loaded', _this);

      //@TODO - Allow the passing in of a function to load additional outbound Middleware
      _this.app.use(_this.circuitBreaker.outboundMiddleware(_this.app));

      // Trying Zones
      _this.app.use(_this.applicationContext.stopContext());
    });
  }

  /**
   * Cleanup handler
   * Perform any necessary cleanup for the server on exit.
   * @param {Object} - ExitHandlerFactory
   * @param {Object} - ModelRepository
   * @returns {Void}
   */
  _bindCleanUp(exitHandlerFactory, modelRepository) {
    process.stdin.resume();//so the program will not close instantly

    // Exit handler
    let exitHandler = exitHandlerFactory(this.id, modelRepository);

    //do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { cleanup: true }));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { cleanup: true }));
  }

}

// Public
module.exports.Server = Server;
