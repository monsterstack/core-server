'use strict';
const appRoot = require('app-root-path');
const ip = require('ip');
const Promise = require('promise');
const swagger = require(appRoot + '/api/swagger/swagger.json');

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
      swagger.host = host;
      swagger.basePath = basePath;

      resolve(swagger);
    });

    return p;

  }
}

// Public
module.exports = SwaggerService;
