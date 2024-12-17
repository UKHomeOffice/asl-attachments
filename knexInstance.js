const knex = require('knex');

async function knexInstance(dbSettings) {
  const config = {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'asl',
      user: 'postgres',
      password: 'test-password'
    }
  };
  console.log(config);
  return knex(config);
}

module.exports = knexInstance;
