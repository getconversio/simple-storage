'use strict';

const multipart = require('connect-multiparty'),
  fs = require('fs'),
  uuid = require('uuid');

module.exports = ({ storage, enableUpload, router }) => {
  router.route(storage.options.apiPath + '/temp')
    .post((req, res, next) => {
      const key = `temp/${uuid.v1()}`;

      storage.getPresignedPutUrl(key)
        .then(url => {
          res.json({
            key,
            url,
            contentType: storage.options.contentType
          });
        })
        .catch(next);
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
