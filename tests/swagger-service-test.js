'use strict';
const SwaggerService = require('../libs/services/swaggerService.js');

// Need to munge the port
const config = require('config');
config.port = 12125;

/**
 * Swagger Service Test
 */
describe('swagger-service', (done) => {
  let swaggerService = null;
  before((done) => {
    swaggerService = new SwaggerService('/api/v1', {} /* base swagger */);
    done();
  });

  it('Swagger host appended', (done) => {
    swaggerService.getSwagger().then((swagger) => {
      if (swagger.host) {
        done();
      } else {
        done(new Error('Missing host'));
      }
    }).catch((err) => {
      done(err);
    });
  });

  it('Swagger schemes appended', (done) => {
    swaggerService.getSwagger().then((swagger) => {
      if (swagger.schemes) {
        done();
      } else {
        done(new Error('Missing host'));
      }
    }).catch((err) => {
      done(err);
    });
  });

  after((done) => {
    done();
  });
});
