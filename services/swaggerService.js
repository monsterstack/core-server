'use strict';
const appRoot = require('app-root-path');
const ip = require('ip');
const Promise = require('promise');
const config = require('config');

const swagger = require(appRoot + '/api/swagger/swagger.json');

class SwaggerService {
  constructor(apiBasePath, swaggerOverride) {
    this.basePath = apiBasePath;
  }

  getSwagger() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      let host = ip.address();
      if(process.env.HOST_IP) {
        host = process.env.HOST_IP;
      }

      swagger.host = `${host}:${config.port}`;
      swagger.basePath = self.basePath;
      swagger.schemes = ['http'];

      resolve(swagger);
    });

    return p;

  }
}

// Public
module.exports = SwaggerService;
