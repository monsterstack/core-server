'use strict';
const HealthService = require('../services/healthService.js');

/**
 * Health Service Test
 */
describe('health-service', (done) => {
    let healthService = null;
    before((done) => {
        healthService = new HealthService();
        done();
    });

    it('Health calculation has loadAvg', (done) => {
        healthService.getHealth().then((health) => {
            console.log(health);
            if(health.loadAvg) {
                if(typeof health.loadAvg === 'number')
                    done();
                else
                    done(new Error('Invalid loadAvg type, expecting `number`'));
            } else {
                done(new Error('Missing loadAvg'));
            }
        }).catch((err) => {
            done(err);
        });
    });

    it('Health calculation has cpuAvg', (done) => {
        healthService.getHealth().then((health) => {
            console.log(health);
            if(health.cpuPercentUsage) {
                if(typeof health.cpuPercentUsage === 'number')
                    done();
                else
                    done(new Error('Invalid cpuAvg type, expecting `number`'));
            } else {
                done(new Error('Missing cpuAvg'));
            }
        }).catch((err) => {
            done(err);
        });
    });

    after((done) => {
        done();
    });
});