'use strict';
const Promise = require('promise');

class HealthService {
  constructor() {
    this.os = require('os');
  }

  
  _cpuAverage() {
    let self = this;

    let cpus = self.os.cpus();
    let totalTick = 0;
    let totalIdle = 0;

    cpus.forEach((cpu) => {
      for(let type in cpu.times) {
        totalTick += cpu.times[type];
      }

      totalIdle += cpu.times.idle;
    });

    return {idle: totalIdle/cpus.length, total: totalTick/cpus.length};
  }

  getHealth() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      let loadAvg = self.os.loadavg();
      let totalLoad = 0;
      loadAvg.forEach((loadAvg) => {
        totalLoad = totalLoad + loadAvg;
      });

      let finalLoadAvg = totalLoad/(loadAvg.length);

      let cpuFirstMeasure = this._cpuAverage();

      setTimeout(() => {
        let cpuSecondMeasure = this._cpuAverage();

        let idleDiff = cpuSecondMeasure.idle - cpuFirstMeasure.idle;
        let totalDiff = cpuSecondMeasure.total - cpuFirstMeasure.total;

        let percentageCPU = 100 - ~~(100 * (idleDiff/totalDiff));

        resolve({
          loadAvg: finalLoadAvg,
          cpuPercentUsage: percentageCPU
        });
      }, 100);
    });

    return p;
  }
}

// Public
module.exports = HealthService;
