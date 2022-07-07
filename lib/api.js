const api = require('@asl/service/api');
const db = require('@asl/schema');
const errorHandler = require('@asl/service/lib/error-handler');

const attachment = require('./routers/attachment');

module.exports = settings => {

  const app = api(settings);
  const models = db(settings.db);

  app.db = models;

  settings.models = models;

  app.use(attachment(settings));

  app.use(errorHandler(settings));

  return app;

};
