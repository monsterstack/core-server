'use strict';
const HttpStatus = require('http-status');
const CONTAINER_ADDR_HEADER_KEY='x-container-addr';

class ContainerIdentifierMiddleware {
    constructor() {

    }

    containerIdentification(app) {
        let self = this;
        return (req, res, next) => {
            res.headers[CONTAINER_ADDR_HEADER_KEY] = app.listeningIp;
            next();
        };
    }
}


module.exports.ContainerIdentifierMiddleware = ContainerIdentifierMiddleware;