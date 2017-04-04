'use strict';
const HttpStatus = require('http-status');

class CircuitBreakerMiddleware {
  constructor(options) {
    this.pathCounts = {};

    this.windowInMillis = 5000;

    this.maxFailureAllowed = 5;
    this.resetDelay = 10000;

    if (options) {
      this.maxFailureAllowed = options.maxFailureAllowed || 5;
    }
  }

  /**
   * InboundMiddleware
   * Initiate Path Counts if not currently existing
   * Check if path failure count equals or gt options.maxFailureAllowed
   *   - if true => respond with unavailable.
   */
  inboundMiddleware(app) {
    let _this = this;
    return (req, res, next) => {
      let path = req.path;
      if (_this.pathCounts.hasOwnProperty(path)) {
        // ignoring
        if (_this.pathCounts[path] >= _this.maxFailureAllowed) {
          res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
            errorMessage: 'Service Unavailable',
          });
        } else {
          next();
        }
      } else {
        _this.pathCounts[path] = 0;
        next();
      }
    };
  }

  outboundMiddleware(app) {
    let _this = this;
    return (req, res, next) => {
      let status = res.statusCode;
      if (status) {
        if (status >= HttpStatus.INTERNAL_SERVER_ERROR
          && status != HttpStatus.SERVICE_UNAVAILABLE) {
          _this.pathCounts[path] = _this.pathCounts[path] + 1;

          if (_this.pathCounts[path] >= _this.maxFailureAllowed) {
            setTimeout(() => {
              _this.pathCounts[path] = 0;
            }, _this.resetDelay);
          }
        }

        next();
      } else {
        next();
      }
    };
  }

  _scheduleCleanup() {
    let _this = this;
    setInterval(() => {
      let keys = Object.keys(_this.pathCounts);

      keys.forEach((key) => {
        if (_this.pathCounts[key] < 3) {
          _this.pathCounts[key] = 0;
        }
      });
    }, _this.windowInMillis);
  }
}

module.exports.CircuitBreakerMiddleware = CircuitBreakerMiddleware;
