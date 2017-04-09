'use strict';

/**
 * ServiceError
 */
class ServiceError extends Error {
  /**
   * Create ServiceError
   * @param status {Number}
   * @param message {String}
   */
  constructor(status, message) {
    this.status = status;
    this.errorMessage = message;
  }

  /**
   * Convert to toJSON
   * @returns {String}
   */
  toJSON() {
    return {
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Write response to http client
   * @param res {HttpResponse}
   * @returns {Void}
   */
  writeResponse(res) {
    res.status(this.status).send({ errorMessage: this.errorMessage });
  }
}

module.exports = ServiceError;
