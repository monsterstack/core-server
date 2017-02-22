'use strict';
const appRoot = require('app-root-path');
const ip = require('ip');
const Promise = require('promise');
const config = require('config');
const swagger = require(appRoot + '/api/swagger/swagger.json');

class SwaggerService {
  constructor(apiBasePath, swaggerOverride) {
    this.basePath = apiBasePath;

    if(swaggerOverride === null) {
      this.swagger = swagger;
    } else {
      this.swagger = swaggerOverride;
    }
  }

  getSwagger() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      let host = ip.address();
      if(process.env.HOST_IP) {
        host = process.env.HOST_IP;
      }

      resolve(self.swagger);
    });

    return p;

  }

  _modifySwagger(swagger, host, basePath) {
    let self = this;
    swagger.host = `${host}:${config.port}`;
    swagger.basePath = basePath;
    swagger.schemes = ['http'];
    return swagger;
  }
}

// Public
module.exports = SwaggerService;
