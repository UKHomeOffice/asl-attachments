const api = require('@asl/service/api');
const db = require('@asl/schema');
const { S3 } = require('@asl/service/clients');
const errorHandler = require('@asl/service/lib/error-handler');

const attachment = require('./routers/attachment');

module.exports = settings => {

  const s3 = S3(settings);

  settings.healthcheck = () => {
    return new Promise((resolve, reject) => {
      s3.headBucket({ Bucket: settings.s3.bucket }, err => err ? reject(err) : resolve());
    });
  };

  const app = api(settings);
  const models = db(settings.db);

  app.db = models;

  settings.models = models;

  app.use(attachment(settings));

  app.use(errorHandler(settings));

  return app;

};
