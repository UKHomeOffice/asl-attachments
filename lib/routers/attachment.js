const { Router } = require('express');
const Busboy = require('busboy');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');
const fs = require('fs');

const { S3 } = require('@asl/service/clients');
const { NotFoundError } = require('@asl/service/errors');

module.exports = settings => {

  const router = new Router();
  const s3 = S3(settings);
  const { Attachment } = settings.models;


  router.post('/server-upload', async (req, res, next) => {
    console.log('managed to get to this new route');
    console.log('big req ------------------------');
    console.log(req);
    // const id = uuid();
    // const fileStream = fs.createReadStream(req.file);
    // fileStream.on('error', function(err) {
    //   console.log('File Error', err);
    // });
    // uploadParams.Body = fileStream;
    // var path = require('path');
    // uploadParams.Key = path.basename(file);


    // s3.upload({
    //   Bucket: settings.s3.bucket,
    //   Key: id,
    //   Body,
    //   ServerSideEncryption: settings.s3.kms ? 'aws:kms' : undefined,
    //   SSEKMSKeyId: settings.s3.kms
    // }, (err, result) => {
    //   err ? reject(err) : resolve(file);
    // });


    return res.status(200).json({ 'foo': 'i am happy' });
  });

  router.post('/', async (req, res, next) => {

    // TODO: we think we can possibly forego busboy entirely
    // Check if we can just grab the file buffer and upload
    console.log('req pre busboy');
    console.log(req.rawHeaders);

    try {
      const busboy = Busboy({ headers: req.headers, filesLimit: 1 });
      const id = uuid();
      const token = crypto.randomBytes(64).toString('hex');
      const transform = sharp().resize(1200, undefined, { withoutEnlargement: true });
      const file = await new Promise((resolve, reject) => {
        busboy.on('file', (field, Body, file) => {
          console.log('got a file', { field, Body, file });

          if (file.mimeType.match(/^image\//)) {
            Body = Body.pipe(transform);
          }
          console.log('this is what the body looks like before sending to s3', Body);

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
