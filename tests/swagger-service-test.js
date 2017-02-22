'use strict';
const config = require('config');
/* Config override */
config.port = 2134;

const ip = require('ip');

const SwaggerService = require('../services/swaggerService');

describe('swagger-service', (done) => {
    before((done) => {
        done();
    });

    it('Swagger Modification Succeeds', (done) => {
        let swaggerOverride = {};

        let swaggerService = new SwaggerService('/api/v1', swaggerOverride);
        
        swaggerService.getSwagger().then((swagger) => {
            if(swagger === null) {
                done(new Error('Missing Swagger'));
            } else if(swagger.host === `${ip.address()}:${config.port}`) {
                done();
            } else {
                done(`Expecting host to be ${ip.address()}:${config.port}`);
            }
        }).catch((err) => {
            done(err);
        })
    });

    after((done) => {
        done();
    });
});