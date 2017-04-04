'use strict';
const Server = require('./libs/server').Server;
const Cluster = require('./libs/cluster').Cluster;

const AuthCheckMiddleware = require('security-middleware').AuthCheckMiddleware;
const RealizationCheckMiddleware = require('discovery-middleware').RealizationCheckMiddleware;



// Public
module.exports.ServiceError = require('./libs/error');
module.exports.HealthService = require('./libs/services/healthService');
module.exports.SwaggerService = require('./libs/services/swaggerService');
module.exports.ProxyCacheService = require('./libs/services/proxyCacheService');
module.exports.Cluster = Cluster;
module.exports.Server = Server;
