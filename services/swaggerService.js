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
      // if(process.env.HOST_IP) {
      //   host = process.env.HOST_IP;
      // }
      let basePath = self.basePath;
      let port = config.port;
      
      swagger.host = `${host}:${port}`;
      swagger.basePath = basePath;
      swagger.schemes = ['http'];

      resolve(swagger);
    });

    return p;

  }
}

// Public
module.exports = SwaggerService;
