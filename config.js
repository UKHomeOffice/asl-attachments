module.exports = {
  port: process.env.PORT || 8092,
  db: {
    database: process.env.DATABASE_NAME || 'asl',
    host: process.env.DATABASE_HOST || 'localhost',
    password: process.env.DATABASE_PASSWORD || 'test-password',
    port: process.env.DATABASE_PORT || 5432,
    username: process.env.DATABASE_USERNAME || 'postgres'
  },
  s3: {
    region: 'eu-west-2',
    accessKey: 'test',
    secret: 'test',
    bucket: 'asl-dev',
    kms: 'kms-aws',
    localstackUrl: 'http://localstack:4566'
  }
};
