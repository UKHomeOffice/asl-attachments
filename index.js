const API = require('./lib/api');
const settings = require('./config');

const startServer = async () => {
  try {
    // Initialize the server asynchronously
    const app = await API(settings);
    const server = app.listen(settings.port);

    server.on('listening', () => {
      console.log(`Listening on port ${server.address().port}`);
    });

    process.on('SIGINT', async () => {
      if (server.listening) {
        console.log('Attempting to exit gracefully.');
        await new Promise((resolve) => server.close(resolve));
        console.log('Server closed. Quitting.');
        process.exit();
      }
    });

    return server;
  } catch (err) {
    console.error('Error starting the server:', err);
    process.exit(1);
  }
};

startServer();
