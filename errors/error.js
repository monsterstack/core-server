'use strict';

class ServiceError {
  constructor(status, message) {
    this.status = status;
    this.errorMessage = message;
  }

  toJSON() {
    return {
      status: this.status,
      errorMessage: this.errorMessage
    };
  }

  writeResponse(res) {
    res.status(this.status).send({ errorMessage: this.errorMessage });
  }
}

module.exports = ServiceError;
