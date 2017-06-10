'use strict';

class Validator {
  validateIdQuery(req) {
    req.checkParams('id', 'Invalid id').isMongoId();
    return req.getValidationResult();
  }

  checkEntityId(req) {
    req.checkBody('id', 'Invalid id').isMongoId();
  }
}

module.exports = Validator;
