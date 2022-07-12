const { Router } = require('express');
const Busboy = require('busboy');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');

const { S3 } = require('@asl/service/clients');
const { NotFoundError } = require('@asl/service/errors');

module.exports = settings => {

  const router = new Router();
  const s3 = S3(settings);
  const { Attachment } = settings.models;

  router.post('/', async (req, res, next) => {
    const busboy = Busboy({ headers: req.headers, filesLimit: 1 });
    const id = uuid();
    const token = crypto.randomBytes(64).toString('hex');
    const transform = sharp().resize(1200, undefined, { withoutEnlargement: true });
    try {
      const file = await new Promise((resolve, reject) => {
        busboy.on('file', (field, Body, file) => {
          if (file.mimeType.match(/^image\//)) {
            Body = Body.pipe(transform);
          }
          s3.upload({
            Bucket: settings.s3.bucket,
            Key: id,
            Body,
            ServerSideEncryption: settings.s3.kms ? 'aws:kms' : undefined,
            SSEKMSKeyId: settings.s3.kms
          }, (err, result) => {
            err ? reject(err) : resolve(file);
          });
        });
        req.pipe(busboy);
      });

      await Attachment.query().insert({ id, token, mimetype: file.mimeType, filename: file.filename });

      return res.status(200).json({ token });
    } catch (e) {
      next(e);
    }

  });

  router.get('/:token', async (req, res, next) => {
    try {
      const attachment = await Attachment.query().findOne({ token: req.params.token });

      if (!attachment) {
        return next(new NotFoundError());
      }

      const params = {
        Key: attachment.id,
        Bucket: settings.s3.bucket
      };

      const stream = s3.getObject(params).createReadStream();
      stream.on('error', e => {
        if (e.code === 'NoSuchKey') {
          return next(new NotFoundError());
        }
        next(e);
      });
      res.set('x-original-filename', attachment.filename);
      res.set('Content-Type', attachment.mimetype);
      stream.pipe(res);
    } catch (e) {
      next(e);
    }
  });

  return router;
};
