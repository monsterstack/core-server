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

const Server = require('./libs/server').Server;
const Cluster = require('./libs/cluster').Cluster;

const AuthCheckMiddleware = require('security-middleware').AuthCheckMiddleware;
const RealizationCheckMiddleware = require('discovery-middleware').RealizationCheckMiddleware;



// Public
module.exports.ServiceError = require('./errors/error');
module.exports.HealthService = require('./services/healthService');
module.exports.SwaggerService = require('./services/swaggerService');
module.exports.ProxyCacheService = require('./services/proxyCacheService');
module.exports.Cluster = Cluster;
module.exports.Server = Server;
