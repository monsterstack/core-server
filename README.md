# core-server

# Configuration
## Base Configuration for all Services / Clusters
```
{
  "port": 10616,
  "discovery": {
    "host": "discovery.digitalfunk.io",
    "port": 7616
  },
  "redis": {
    "host": "redis.digitalfunk.io",
    "port": 6379
  },
  "stash": {
    "type": "tcp",
    "host": "mb.digitalfunk.io",
    "port": 9600
  },
  "websockets": {
    "enabled": true
  }
}
```
### Configuration is expected to be in:
#### ./config/default.json or
#### ./config/test.json or
#### ./config/prod.json

# Cluster
## Cluster is used to create a 'local cluster' of your Service

```
let cluster = new Cluster(announcement.name, announcement, options);

  /* Start the Cluster */
  cluster.start();

  cluster.onProxyReady((proxy) => {
    setInterval(() => {
      cluster.reannounce(config);
    }, 2*60*1000);
  });
```

## Every Cluster 'gossips' with other local Cluster(s) to elect a global Cluster Master
## By checking for 'master' status you restrict workers from doing certain things.
```
  /** Health Check Schedule **/
  let masterCheck = () => {
    return cluster.iAmMaster;
  };
  // Only schedule health check if cluster.iAmMaster
  startup.scheduleHealthCheck(model, masterCheck, healthCheckInterval, cluster);
```
# Server
## Dynamically loads all routes provided in the Service available in
### /api/**/routes/*.js
## Sample Route
```
'use strict';

const controller = require('../controllers/health.controller.js');

module.exports = (app) => {
    app.get('/health', controller.getHealth(app));
}
```
### The expectation is that each route knows where the controller is and loads the controller it self.

## Sample Controller
```
'use strict';

const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const ServiceError = require('core-server').ServiceError;
const HealthService = require('core-server').HealthService;


const getHealth = (app) => {
  return (req, res) => {
    let healthService = new HealthService();
    healthService.getHealth().then((health) => {
      res.status(HttpStatus.OK).send(health);
    }).catch((err) => {
      new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    });
  }
}

/* Public */
exports.getHealth = getHealth;
```
## Full Sample
```
let Server = require('core-server').Server;
  let server = new Server(announcement.name, announcement, typeQuery, {
    discoveryHost: discoveryHost,
    discoveryPort: config.discovery.port || 7616,
    useRandomWorkerPort: useRandomWorkerPort
  });

  /** Init and handle lifecycle **/
  server.init().then(() => {
    // Get Express App
    let app = server.getApp();

    // Enable Static Content
    app.set('view engine', 'ejs');
    app.use('/portal', express.static(path.join(__dirname + '/portal')));
    app.use('/public', express.static(path.join(__dirname, 'public')));

    // Load Http Routes
    server.loadHttpRoutes();

    // Listen for Requests
    server.listen().then(() => {
      console.log('Up and running..');

      // Either Announce or Query.
      if(announce === true) {
        server.announce();
      } else {
        server.query();
      }
    });
  }).catch((err) => {
    console.log(err);  
  });

```

## Other Available Infrastructure
### Socket IO + IORedis
```
    server.init().then(() => {
        let io = server.getIo();
        let ioRedis = server.getIoRedis();
    });
```

# Utilities
## Hash
### Get a sha256 hash
```
    let hasher = new Hash();
    let result = hasher.sha256('hello');
```

### Hash an ip address
```
    let hasher = new Hash();
    let result = hasher.ipHash([[0, 1], [2, 3], [4, 5]], 985350543);
```

## ServiceError
### Error used for Http Error Responses
```
    let error = new ServiceError(HttpStatus.NOT_FOUND, 'Not Found');
    error.writeResponse(res);
```