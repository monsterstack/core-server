'use strict';
const jwt = require('jsonwebtoken');

const TOKEN_EXPIRED_ERR = 'TokenExpiredError';
const JSON_WEB_TOKEN_ERR = 'JsonWebTokenError';

const MALFORMED_JWT_MESSAGE = 'jwt malformed';
const SIGNATURE_REQUIRED_MESSAGE = 'jwt signature required';
const ISSUER_INVALID_MESSAGE = 'jwt issuer invalid';
const ID_INVALID_MESSAGE = 'jwt id invalid';
const SUBJECT_INVALID_MESSAGE = 'jwt subject invalid';
const INVALID_SIGNATURE_MESSAGE = 'jwt signature is required';

class ApiSecretFactory {
  createTenantApiSecret(tenant) {
    var token = jwt.sign({
      auth:  'magic',
      agent: 'x-cdsp-tenant',
      scope: 'Tenant',
      name: tenant.name,
      exp:   Math.floor(new Date().getTime() / 1000) + 7 * 24 * 60 * 60, // Note: in seconds!
    }, tenant.apiKey);  // secret is defined in the environment variable JWT_SECRET
    return token;
  }

  createApplicationApiSecret(application) {
    var token = jwt.sign({
      auth:  'magic',
      agent: 'x-cdsp-application',
      scope: 'Application',
      name: application.name,
      tenantId: application.tenantId,
      exp:   Math.floor(new Date().getTime() / 1000) + 7 * 24 * 60 * 60, // Note: in seconds!
    }, application.apiKey);  // secret is defined in the environment variable JWT_SECRET
    return token;
  }

  verifySecret(secret, key) {
    let p = new Promise((resolve, reject) => {
      jwt.verify(secret, key, (err, result) => {
        if (err) {
          if (err.name === JSON_WEB_TOKEN_ERR) {
            reject(new ServiceError(HttpStatus.FORBIDDEN, err.message));
          } else if (err.name === TOKEN_EXPIRED_ERR) {
            reject(new ServiceError(HttpStatus.UNAUTHORIZED, err.message));
          }
        } else {
          resolve(result);
        }
      });
    });
    return p;
  }
}

module.exports.ApiSecretFactory = ApiSecretFactory;
