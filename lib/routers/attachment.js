const { Router } = require('express');
const Busboy = require('busboy');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');
const { S3 } = require('@asl/service/clients');
const { NotFoundError } = require('@asl/service/errors');

module.exports = async settings => {
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
        busboy.on('file', (field, Body, fileStream) => {
          console.log(`Received file: ${field}, mimeType: ${fileStream.mimeType}`);

          // Check if the file is an image and apply the transform
          if (fileStream.mimeType.match(/^image\//)) {
            console.log('File is an image, applying transformation');
            Body = Body.pipe(transform); // Transform the image stream if needed
          }

          // Upload to S3
          s3.upload({
            Bucket: settings.s3.bucket,
            Key: id,
            Body,
            ServerSideEncryption: settings.s3.kms ? 'aws:kms' : undefined,
            SSEKMSKeyId: settings.s3.kms
          }, (err, result) => {
            if (err) {
              console.error('S3 upload error:', err);
              reject(err); // Reject the promise on S3 upload error
            } else {
              console.log('File uploaded to S3 successfully:', result);
              resolve(fileStream); // Resolve with the file once uploaded
            }
          });
        });

        busboy.on('error', error => {
          console.error('Busboy error:', error);
          reject(error); // Reject the promise if Busboy encounters an error
        });

        req.pipe(busboy).on('error', error => {
          console.error('Error during request piping:', error);
          reject(error); // Handle errors when piping the request
        });
      });

      try {
        // Insert the attachment metadata into the database
        await Attachment.query().insert({ id, token, mimetype: file.mimeType, filename: file.filename });

      } catch (e) {
        console.error(e);
      }
      return res.status(200).json({ token });
    } catch (e) {
      console.error('Error during file processing:', e);
      next(e); // Pass the error to the next handler
    }
  });

  // Get attachment by token
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
