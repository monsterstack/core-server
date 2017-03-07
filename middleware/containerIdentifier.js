'use strict';
const HttpStatus = require('http-status');
const CONTAINER_ADDR_HEADER_KEY='x-container-addr';

class ContainerIdentifierMiddleware {
    constructor() {

    }

    containerIdentification(app) {
        let self = this;
        return (req, res, next) => {
            if(process.env.CONTAINER_ADDR) {
                res.headers[CONTAINER_ADDR_HEADER_KEY] = process.env.CONTAINER_ADDR;
            }    
            next();
        };
    }
}


module.exports.ContainerIdentifierMiddleware = ContainerIdentifierMiddleware;