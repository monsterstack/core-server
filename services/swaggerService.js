'use strict';
const appRoot = require('app-root-path');
const ip = require('ip');
const Promise = require('promise');
const config = require('config');
const _ = require('lodash');

/**
 * SwaggerService
 * @param apiBasePath
 * @param baseSwagger
 * @param options
 * 
 * options
 * host - ip of hosting server
 * port - port of hosting server
 * 
 * Above options are optional and default to config settings.
 * if ENV HOST_IP exists options are overriding by environment var.
 */
class SwaggerService {
  constructor(apiBasePath, baseSwagger, options) {
    this.basePath = apiBasePath;
    this.baseSwagger = baseSwagger;

    this.options = options;
  }

  getSwagger() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      let host = ip.address();

      if(this.options && this.options.hasOwnProperty('host')) {
        host = this.options.host;
      } else if(process.env.HOST_IP) {
        host = process.env.HOST_IP;
      } else if(process.env.CONTAINER_ADDR) {
        host = process.env.CONTAINER_ADDR;
      }

      let swagger = _.clone(self.baseSwagger);
      let port = config.port;
      if(this.options && this.options.hasOwnProperty('port')) {
        port = this.options.port;
      }
      swagger.host = `${host}:${port}`;
      swagger.basePath = self.basePath;
      swagger.schemes = ['http'];

      resolve(swagger);
    });

    return p;

  }
}

// Public
module.exports = SwaggerService;
