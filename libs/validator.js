'use strict';

class Validator {
  validateIdQuery(req) {
    req.checkParams('id', 'Invalid id').isMongoId();
    return req.getValidationResult();
  }
}

module.exports = Validator;
