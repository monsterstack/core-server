'use strict';

/**
 * ServiceError
 */
class ServiceError {
  /**
   * Create ServiceError
   * @param status {Number}
   * @param message {String}
   * @param validationErrors {Array}
   */
  constructor(status, message, validationErrors) {
    this.status = status;
    this.errorMessage = message;

    if (validationErrors) {
      this.errors = validationErrors;
    }
  }

  /**
   * Convert to toJSON
   * @returns {String}
   */
  toJSON() {
    return {
      errorMessage: this.errorMessage,
      errors: this.errors,
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
