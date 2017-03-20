'use strict';
const Bronto = require('bronto');

/**
 * Leader
 * Utilizes the 'Bully' algorithm to determine the 'master' in a
 * cluster of nodes.
 */
class Leader {
  /**
   * Create Leader
   * @param redisCli {Object} - Redis Client 
   * @param redisSub {Object} - Redis subscriber
   * @param options {Object} - Options
   */
  constructor(redisCli, redisSub, options) {
    this.redisCli = redisCli;
    this.redisSub = redisSub;
    this.options = options;
    if(this.redisCli && this.redisSub) {
      let brontoSettings = {
        client: this.redisCli, 
        subscriber: this.redisSub
      };

      this.me = new Bronto(brontoSettings);
    } else {
      throw new Error("Missing Redis Client");
    }
  }

  /**
   * Handle cases where the Leader has 'stepped_down'
   * @param handler {Object} - callback that takes election results
   * @return {Object} - Election result
   */
  onStepDown(handler) {
    this.me.on('stepped_down', (election) => {
      handler(election);
    });
  }

  /**
   * Handle cases where the Leader has 'stepped_up'
   * @param handler {Object} - callback that takes election results
   * @return {Object} - Election result
   */
  onStepUp(handler) {
    this.me.on('master', (election) => {
      handler(election);
    });
  }

  /**
   * Join cluster
   * @param group {String}
   * 
   * @returns {Void}
   */
  join(group) {
    this.me.join(group);
  }
}

// Public
module.exports = Leader;
