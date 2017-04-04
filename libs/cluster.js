'use strict';
const debug = require('debug')('core-server');
const redis = require('redis');
const config = require('config');
const cluster = require('cluster');
const net = require('net');
const Leader = require('./leader');
const Hash = require('./hash').Hash;
const expressMetrics = require('express-metrics');

const Node = require('./node').Node;

// Service ID
const ID = require('node-uuid').v1();

/**
 * Cluster
 * Responsible for managing Servers as worker processes.
 */
class Cluster extends Node {

  /**
   * Create Cluster
   * @param name  {String} - Cluster Group Name
   * @param announcement {Object} - ServiceDescriptor details about the Service Cluster being
   *        formed -- Required
   * @param options {Object}
   *
   * Valid Options:
   * - numWorkers ( integer )
   * - discoveryHost ( string )
   * - overrides ( string path to override config )
   */
  constructor(name, announcement, options) {
    super();
    this.id = ID;
    this.options = options;
    this.clusterName = name;

    this.clusterArgs = ['--use', 'http', '--randomWorkerPort', 'true', '--announce', 'false'];

    if (options.overridesPath) {
      this.clusterArgs.push('--overrides');
      this.clusterArgs.push(options.overridesPath);
    }

    this.cluster = cluster;

    this.numCPUs = require('os').cpus().length;

    this.proxy = require('discovery-proxy');

    if (options.numWorkers) {
      this.numCPUs = options.numWorkers;
    }

    // Round Robin Scheduling
    this.cluster.schedulingPolicy = cluster.SCHED_RR;

    this.iAmMaster = false;

    // All hell breaks loose if announcement is missing.
    if (announcement === undefined)
      throw new Error('Missing Announcement');

    this.announcement = announcement;

    this.workers = [];

    this.cluster.setupMaster({
      exec: 'server.js',
      args: this.clusterArgs,
      silent: false,
    });
  }

  /**
   * Get Me
   * Generate ServiceDescriptor from announcement data and config.
   * Also, supplement with endpoint details using known ip address and configured port.
   * @param config {Object}
   * @param portOverride {Number}
   * @returns {Promise}
   */
  getMe(config, portOverride) {
    debug(this.announcement);
    let descriptor = {
      type: this.announcement.name,
      healthCheckRoute: '/health',
      schemaRoute: '/swagger.json',
      docsPath: this.announcement.docsPath,
      timestamp: new Date(),
      id: ID,
      region: this.announcement.region,
      stage: this.announcement.stage,
      status: 'Online',
      version: this.announcement.version,
    };

    let myPort = config.port;
    if (portOverride) {
      myPort = portOverride;
    }

    let p = this.getIp().then((ip) => {
      let endpoint = `http://${ip}:${myPort}`;
      descriptor.endpoint = endpoint;
      return descriptor;
    });

    return p;
  }

  /**
   * Bind ExitHandler to process.
   * Support supplemental cleanup efforts.
   *
   * Sample ExitHandler.
   * @TODO: Add Sample Here.
   * @param exitHandler {Object}
   * @returns {Void}
   */
  bindExitHandler(exitHandler) {
    process.stdin.resume();//so the program will not close instantly
    //do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { cleanup: true }));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { cleanup: true }));
  }

  /**
   * Announce yourself to the Discovery Service
   * @param config {Object}
   * @param port {Number}
   * @returns {Void}
   */
  announce(config, port) {
    let _this = this;

    //Dispatch Proxy -- init / announce
    _this.getMe(config, port).then((me) => {
      debug(me);
      let discoveryHost = config.discovery.host;
      let discoveryPort = config.discovery.port;
      let addr = `http://${discoveryHost}:${discoveryPort}`;
      _this.proxy.connect({ addr: addr }, (err, p) => {
        if (err) {
          console.log(err);
        } else {
          // Clusters only announce.  Leave query to workers.
          debug('Binding to Discovery Service and announcing...');
          debug(me);
          p.bind({ descriptor: me, types: [] });
          _this.proxy = p;
        }
      });
    }).catch((err) => {
      console.log('******************** Error **********');
      console.log(err);
    });
  }

  /**
   * Reannounce
   * @returns {Void}
   */
  reannounce() {
    if (this.proxy) {
      debug('Reannouncing...');
      let _this = this;
      let port = _this.clusterPort;
      this.getMe(config, port).then((me) => {
        _this.proxy.client.sendInitReq(me, []);
      }).catch((err) => {
        console.log(err);
      });
    }
  }

  /**
   * Start Local Cluster of Service nodes.
   * Establish a Cluster Group Name and attempt to establish a leader, amongst
   * external cluster members.
   *
   * self.name will be used as the Cluster Group Name.
   * @returns {Void}
   */
  start() {
    let _this = this;
    if (_this.cluster.isMaster) {

      // Fork workers. One per CPU for maximum effectiveness
      for (let i = 0; i < self.numCPUs; i++) {
        !function spawn(i) {
          self.workers[i] = self.cluster.fork();

          self.workers[i].on('exit', function () {
            console.error('sticky-session: worker died');
            setTimeout(() => {
              spawn(i);
            }, 2000);
          });

          self.workers[i].send({ id: self.id });

        }(i);
      }

      _this.cluster.on('listening', (worker, address) => {
        debug('A worker is now connected to ' + address.address + ':' + address.port);
      });

      _this.cluster.on('online', (worker) => {
        debug('Worker is online');
      });

      let server = net.createServer({ pauseOnConnect: true }, (c) => {
        let seed = ~~(Math.random() * 1e9);
        let hasher = new Hash();

        // Get int31 hash of ip
        let worker;
        let ipIndex = hasher.ipHash((c.remoteAddress || '').split(/\./g), seed);

        // Pass connection to worker
        worker = _this.workers[ipIndex % _this.workers.length];
        try {
          worker.send('sticky-session:connection', c);
        } catch (err) {
          console.log(err);
        }
      });

      let myPort = config.port;

      if (process.env.PORT) {
        myPort = process.env.PORT;
      }

      self.clusterPort = myPort;

      server.listen(myPort, () => {
        setTimeout(() => {
          //Dispatch Proxy -- init / announce
          debug('Cluster Announce');
          _this.announce(config, server.address().port);
        }, 6000);
      });

      expressMetrics.listen(myPort + 1);

      /** Deal with Election of Group Leader **/
      let redisClient = redis.createClient({
        host: config.redis.host,
        port: config.redis.port || 6379,
        retry_strategy: self.redisRetryStrategy(),
      });

      redisClient.on('error', (err) => {
        console.log(err);
      });

      /*
       * Wait till client is ready before joining
       * cluster and initializing an election.
       */
      redisClient.on('ready', () => {
        let redisSub = redis.createClient({
          host: config.redis.host,
          port: config.redis.port || 6379,
          retry_strategy: self.redisRetryStrategy(),
        });

        redisSub.on('error', (err) => {
          console.log(err);
        });

        let leader = new Leader(redisClient, redisSub);
        leader.onStepUp((groupName) => {
          debug('******************* I am master');
          debug(`Steppoing up on ${groupName}`);
          self.iAmMaster = true;
        });

        leader.onStepDown((groupName) => {
          debug(`Stepping down from ${groupName}`);
          self.iAmMaster = false;
        });

        leader.join(`${this.clusterName}-Cluster`);
      });
    }
  }
}

// Public
module.exports.Cluster = Cluster;
