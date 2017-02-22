'use strict';
const appRoot = require('app-root-path');
const ip = require('ip');
const Promise = require('promise');
const config = require('config');
const swagger = require(appRoot + '/api/swagger/swagger.json');

class SwaggerService {
  constructor(apiBasePath, swaggerOverride) {
    this.basePath = apiBasePath;
    this.swagger = swagger;
  }

  getSwagger() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      let host = ip.address();
      if(process.env.HOST_IP) {
        host = process.env.HOST_IP;
      }

      self.swagger.host = `${host}:${config.port}`;
      self.swagger.basePath = self.basePath;
      self.swagger.schemes = ['http'];
      resolve(self.swagger);
    });

    return p;

  }
}

// Public
module.exports = SwaggerService;
