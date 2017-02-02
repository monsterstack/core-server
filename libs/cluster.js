'use strict';
const redis = require('redis');
const config = require('config');
const cluster = require('cluster');


class Cluster {
  constructor(name, announcement, types, options) {
    this.clusterName = name;
    this.clusterArgs = ['--use', 'http', '--randomWorkerPort', 'true'];
    this.cluster = cluster;
    this.cluster.schedulingPolicy = cluster.SCHED_RR;

    this.iAmMaster = false;

    this.types = types || [];
    this.announcement = announcement;

    this.workers = [];

    this.cluster.setupMaster({
      exec: 'server.js',
      args: this.clusterArgs,
      silent: false
    });
  }

  getMe(config) {
    let descriptor = {
      type: announcement.type,
      healthCheckRoute: '/health',
      schemaRoute: '/swagger.json',
      timestamp: new Date(),
      id: ID,
      region: announcement.region,
      stage: announcement.stage,
      status: 'Online',
      version: announcement.version
    };

    let p = new Promise((resolve, reject) => {
      let ip = require('ip');
      console.log(ip.address());
      descriptor.endpoint = "http://"+ip.address()+":"+config.port
      resolve(descriptor);
    });
    return p;
  }

  bindExitHandler(exitHandler) {
    process.stdin.resume();//so the program will not close instantly
    //do something when app is closing
    process.on('exit', exitHandler.bind(null,{cleanup:true}));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {cleanup:true}));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));
  }


  start() {
    let exitHandler = require('discovery-proxy').exitHandlerFactory(ID, model);
    this.bindExitHandler(exitHandler);
    let self = this;
    if (self.cluster.isMaster) {

      // Fork workers. One per CPU for maximum effectiveness
      for (let i = 0; i < numCPUs; i++) {
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
          worker = self.workers[ipIndex%workers.length];
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
                p.bind({ descriptor: me, types: self.types });
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
