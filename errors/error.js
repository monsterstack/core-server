'use strict';

class ServiceError {
  constructor(status, message) {
    this.status = status;
    this.message = message;
  }

  toJSON() {
    return {
      errorMessage: this.message
    };
  }

  writeResponse(res) {
    res.status(this.status).send({ errorMessage: this.message });
  }
}

module.exports = ServiceError;
