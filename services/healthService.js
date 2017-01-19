'use strict';
const Promise = require('promise');

class HealthService {
  constructor() {
    this.os = require('os');
  }

  getHealth() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      let loadAvg = self.os.loadavg();
      let cpus = self.os.cpus();
      let cpuMeasures = [];
      cpus.forEach((cpu) => {
        cpuMeasures.push(cpu.times);
      });

      resolve({
        loadAvg: loadAvg,
        cpus: cpus
      })
    });

    return p;
  }
}

// Public
module.exports = HealthService;
