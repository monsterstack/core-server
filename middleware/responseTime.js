'use strict';

class ResponseTimeMiddleware {
    constructor() {

    }

    computeResponseTime(clbk) {
        return (req, res, next) => {
            let removeListeners = (res) => {
                res.removeListener('finish', compute);
                res.removeListener('close', cancel);
            }

            let compute = () => {

                removeListeners(res);
                let stop = Date.now();
                let diff = stop - start;

                clbk(diff);
            };

            let cancel = () => {
                removeListeners(res);
                clbk(NaN);
            }

            
            let start = Date.now();

            res.on('finish', compute);

            res.on('close', cancel);

            next();
        }
    }

}


module.exports.ResponseTimeMiddleware = ResponseTimeMiddleware;