'use strict';

class CircuitBreakerMiddleware {
  constructor(options) {
    this.pathCounts = {};

    this.windowInMillis = 5000;

    this.maxFailureAllowed = 5;
    this.resetDelay = 10000;

    if(options) {
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
    let self = this;
    return (req, res, next) => {
      let path = req.path;
      if(self.pathCounts.hasOwnProperty(path)) {
        // ignoring
        if(self.pathCounts[path] >= self.maxFailureAllowed) {
          res.status(HttpStatus.SERVICE_UNAVAILABLE).send( {
            errorMessage: "Service Unavailable"
          });
        } else {
          next();
        }
      } else {
        self.pathCounts[path] = 0;
        next();
      }
    }
  }

  outboundMiddleware(app) {
    let self = this;
    return (req, res, next) => {
      let status = res.statusCode;
      if(status) {
        if(status >= 500 && status != 503) {
          self.pathCounts[path] = self.pathCounts[path] + 1;

          if(self.pathCounts[path] >= self.maxFailureAllowed) {
            setTimeout(() => {
              self.pathCounts[path] = 0;
            }, self.resetDelay);
          }
        }
        next();
      } else {
        next();
      }
    }
  }

  _scheduleCleanup() {
      setInterval(() => {
        let keys = Object.keys(self.pathCounts);

        keys.forEach((key) => {
          if(self.pathCounts[key] < 3) {
            self.pathCounts[key] = 0;
          }
        });
      }, this.windowInMillis);
  }
}

module.exports.CircuitBreakerMiddleware = CircuitBreakerMiddleware;
