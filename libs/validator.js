'use strict';

class Validator {
  validateIdQuery(req) {
    req.checkParams('id', 'Invalid id').isMongoId();
    return req.getValidationResult();
  }

  checkParamsExist(req, params) {
    params.forEach((param) => {
      req.checkParams(param, `${param} is required`).notEmpty();
    });
  }

  checkEntityId(req) {
    req.checkBody('id', 'Invalid id').isMongoId();
  }
}

module.exports = Validator;
