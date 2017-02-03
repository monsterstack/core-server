'use strict';
const redis = require('redis');
const config = require('config');
const cluster = require('cluster');
const net = require('net');
const Leader = require('./leader');
const hash = require( './hash');
// Service ID
const ID = require('node-uuid').v1();

class Cluster {
  /**
   * Create Cluster
   * @param name  Cluster Group Name
   * @param announcement ServiceDescriptor details about the Service Cluster being
   *        formed -- Required
   * @param options Configuration Options
   *
   *
   * Valid Options:
   * - numWorkers ( integer )
   * - discoveryHost ( string )
   */
  constructor(name, announcement, options) {
    this.id = ID;
    this.clusterName = name;
    this.clusterArgs = ['--use', 'http', '--randomWorkerPort', 'true', '--announce', 'false'];
    this.cluster = cluster;

    this.numCPUs = require('os').cpus().length;

    if(options.numWorkers) {
      this.numCPUs = options.numWorkers;
    }

    // Round Robin Scheduling
    this.cluster.schedulingPolicy = cluster.SCHED_RR;

    this.iAmMaster = false;

    // All hell breaks loose if announcement is missing.
    if(announcement === undefined)
      throw new Error("Missing Announcement");

    this.announcement = announcement;

    this.workers = [];

    this.cluster.setupMaster({
      exec: 'server.js',
      args: this.clusterArgs,
      silent: false
    });
  }

  /**
   * Get Me
   * Generate ServiceDescriptor from announcement data and config.
   * Also, supplement with endpoint details using known ip address and configured port.
   * @param config Configuration
   */
  getMe(config) {
    let descriptor = {
      type: this.announcement.type,
      healthCheckRoute: '/health',
      schemaRoute: '/swagger.json',
      timestamp: new Date(),
      id: ID,
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

  /**
   * Bind ExitHandler to process.
   * Support supplemental cleanup efforts.
   *
   * Sample ExitHandler.
   * @TODO: Add Sample Here.
   */
  bindExitHandler(exitHandler) {
    process.stdin.resume();//so the program will not close instantly
    //do something when app is closing
    process.on('exit', exitHandler.bind(null,{cleanup:true}));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {cleanup:true}));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));
  }

  /**
   * Start Local Cluster of Service nodes.
   * Establish a Cluster Group Name and attempt to establish a leader, amongst
   * external cluster members.
   *
   * self.name will be used as the Cluster Group Name.
   */
  start() {
    let self = this;
    if (self.cluster.isMaster) {

      // Fork workers. One per CPU for maximum effectiveness
      for (let i = 0; i < self.numCPUs; i++) {
          !function spawn(i) {
              self.workers[i] = self.cluster.fork();

              self.workers[i].on('exit', function() {
                  console.error('sticky-session: worker died');
                  setTimeout(() => {
                    spawn(i);
                  }, 2000);
              });

          }(i);
      }

      self.cluster.on('listening', (worker, address) => {
          console.log('A worker is now connected to ' + address.address + ':' + address.port);
      });

      self.cluster.on('online', (worker) => {
          console.log("Worker is online");
      });

      let server = net.createServer({ pauseOnConnect: true }, (c) => {
          let seed = ~~(Math.random() * 1e9);
          // Get int31 hash of ip
          let worker,
              ipIndex = hash((c.remoteAddress || '').split(/\./g), seed);
          // Pass connection to worker
          worker = self.workers[ipIndex%self.workers.length];
          worker.send('sticky-session:connection', c);
      });


      server.listen(config.port, () => {
        setTimeout(() => {
          //Dispatch Proxy -- init / announce
          self.getMe(config).then((me) => {
            console.log(me);
            proxy.connect({addr:'http://0.0.0.0:'+config.port}, (err, p) => {
              if(err) {
                console.log(err);
              } else {
                // Clusters only announce.  Leave query to workers.
                p.bind({ descriptor: me, types: [] });
              }
            });
          }).catch((err) => {
            console.log("******************** Error **********")
            console.log(err);
          });
        }, 500);
      });

      /** Deal with Election of Group Leader **/
      let redisClient = redis.createClient({
        host: config.redis.host
      });
      let leader = new Leader(redisClient);
      leader.onStepUp((groupName) => {
        console.log("******************* I am master");
        console.log(groupName);
        self.iAmMaster = true;
      });

      leader.onStepDown((groupName) => {
        console.log(groupName);
        self.iAmMaster = false;
      });

      leader.join(`${this.clusterName}-Cluster`);
    }
  }
}

module.exports.Cluster = Cluster;
