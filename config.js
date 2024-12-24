module.exports = {
  port: process.env.PORT || 8080,
  db: {
    database: process.env.DATABASE_NAME || 'asl',
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD || 'test-password',
    port: process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME || 'postgres'
  },
  s3: {
    region: process.env.S3_REGION || 'eu-west-2',
    accessKey: process.env.S3_ACCESS_KEY,
    secret: process.env.S3_SECRET,
    bucket: process.env.S3_BUCKET,
    kms: process.env.S3_KMS_KEY_ID,
    localstackUrl: process.env.S3_LOCALSTACK_URL
  }
};
