'use strict';

const multipart = require('connect-multiparty'),
  fs = require('fs'),
  uuid = require('uuid');

module.exports = ({ storage, enableUpload, router }) => {
  router.route(storage.options.apiPath + '/temp')
    .post((req, res, next) => {
      try {
        const key = `temp/${uuid.v1()}`;

        const url = storage.getPresignedPutUrl(key);
        res.json({
          key,
          url,
          contentType: storage.options.contentType
        });
      } catch (e) {
        return next(e);
      }
    });

  if (enableUpload) {
    router.route(storage.options.apiPath + '/:key(*)')
      .put(multipart(), (req, res, next) => {
        fs.rename(req.files.file.path, storage.options.localDirectory + '/' + req.params.key, err => {
          if (err) return next(err);
          res.sendStatus(200);
        });
      });
  }

  return router;
};
