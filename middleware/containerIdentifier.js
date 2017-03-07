'use strict';
const HttpStatus = require('http-status');
const CONTAINER_ADDR_HEADER_KEY='x-container-addr';

class ContainerIdentifierMiddleware {
    constructor() {

    }

    containerIdentification(app) {
        let self = this;
        return (req, res, next) => {
            let headers = {};
            headers[CONTAINER_ADDR_HEADER_KEY] = app.listeningIp;
            res.set(headers);
            next();
        };
    }
}


module.exports.ContainerIdentifierMiddleware = ContainerIdentifierMiddleware;