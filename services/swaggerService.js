'use strict';
const appRoot = require('app-root-path');
const ip = require('ip');
const Promise = require('promise');
const config = require('config');
const _ = require('lodash');

class SwaggerService {
  constructor(apiBasePath, baseSwagger, options) {
    this.basePath = apiBasePath;
    this.baseSwagger = baseSwagger;
  }

  getSwagger() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      let host = ip.address();
      if(process.env.HOST_IP) {
        host = process.env.HOST_IP;
      }

      let swagger = _.clone(self.baseSwagger);
      let port = config.port;
      if(options.port) {
        port = options.port;
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
