'use strict';
const appRoot = require('app-root-path');
const ip = require('ip');
const Promise = require('promise');
const swagger = require(appRoot + '/api/swagger/swagger.json');
const config = require('config');

class SwaggerService {
  constructor(basePath) {
    this.basePath = basePath;
  }

  getSwagger() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      let host = ip.address();
      //@TODO: Base Path should be in config..
      let basePath = self.basePath;
      let port = config.port;
      swagger.host = `${host}`;
      swagger.port = `${port}`;
      swagger.basePath = basePath;
      swagger.schemes = ['http'];

      resolve(swagger);
    });

    return p;

  }
}

// Public
module.exports = SwaggerService;
