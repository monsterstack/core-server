'use strict';

module.exports = (app) => {
  app.get('/api/v1/greetings', (req, res) => {
    res.status(HttpStatus.OK).send({ msg: 'Hello' });
  });
};
