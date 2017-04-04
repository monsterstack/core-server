'use strict';
const Promise = require('promise');

/**
 * Health Service
 */
class HealthService {

  /**
   * Create a Health Service
   */
  constructor() {
    this.os = require('os');
  }

  _cpuAverage() {
    let _this = this;
    let cpus = _this.os.cpus();
    let total = _this._totalCpu(cpus);
    return { idle: total.totalIdle / cpus.length, total: total.totalTick / cpus.length };
  }

  /**
   * Compute Health
   * @returns {Promise Chain}
   */
  getHealth() {
    let _this = this;
    let p = new Promise((resolve, reject) => {
      let loadAvg = _this.os.loadavg();
      let totalLoad = _this._totalLoad(loadAvg);

      let finalLoadAvg = totalLoad / (loadAvg.length);

      let cpuFirstMeasure = _this._cpuAverage();

      const calculation = () => {
        let cpuSecondMeasure = _this._cpuAverage();

        let percentageCPU = _this._calculatePercentageCPU(cpuFirstMeasure, cpuSecondMeasure);

        resolve({
          loadAvg: finalLoadAvg,
          cpuPercentUsage: percentageCPU,
        });
      };

      setTimeout(calculation, 10);
    });

    return p;
  }

  /**
   * Calculate Percentage CPU
   */
  _calculatePercentageCPU(firstMeasure, secondMeasure) {
    let idleDiff = secondMeasure.idle - firstMeasure.idle;
    let totalDiff = secondMeasure.total - firstMeasure.total;

    let percentageCPU = 100 - ~~(100 * (idleDiff / totalDiff));
    return percentageCPU;
  }

  /**
   * Count Total Load
   */
  _totalLoad(loadArray) {
    let total = 0;
    loadArray.forEach((load) => {
      total += load;
    });

    return total;
  }

  /**
   * Count Total CPU Measures
   */
  _totalCpu(cpus) {
    let totalTick = 0;
    let totalIdle = 0;

    cpus.forEach((cpu) => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }

      totalIdle += cpu.times.idle;
    });

    // CPU Count
    return { totalTick: totalTick, totalIdle: totalIdle };
  }
}

// Public
module.exports = HealthService;
