const api = require('@asl/service/api');
const db = require('../asl-schema');
const { S3 } = require('@asl/service/clients');
const errorHandler = require('@asl/service/lib/error-handler');

const attachment = require('./routers/attachment');

module.exports = async settings => {
  // Initialize S3 client with provided settings
  const s3 = S3(settings);

  /**
   * Healthcheck: Ensures S3 bucket accessibility and DB connectivity
   */
  settings.healthcheck = async () => {
    try {
      await Promise.all([
        new Promise((resolve, reject) => {
          s3.headBucket({ Bucket: settings.s3.bucket }, err => err ? reject(err) : resolve());
        }),
        settings.db.raw('SELECT 1')
      ]);
      console.info('Healthcheck passed:');
    } catch (error) {
      console.error('Healthcheck failed:', error);
      throw error;
    }
  };

  // Initialize API application
  const app = await api(settings);

  // Initialize and attach database models
  const models = await db(settings.db);
  app.db = models;
  settings.models = models;

  // Register routers
  app.use(await attachment(settings));

  // Register error handler
  app.use(await errorHandler(settings));

  return app;
};
