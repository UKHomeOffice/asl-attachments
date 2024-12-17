const request = require('supertest');
const AWS = require('aws-sdk');
const knex = require('../asl-schema'); // Path to your Knex configuration
const api = require('@asl/service/api'); // Path to your Express app
const crypto = require('crypto');

// LocalStack configuration for S3
const s3 = new AWS.S3({
  endpoint: 'http://localhost:4566', // LocalStack S3 endpoint
  s3ForcePathStyle: true,
  accessKeyId: 'test',
  secretAccessKey: 'test'
});

// Test constants
const TEST_BUCKET = 'test-bucket';

let server;

describe('attachment', () => {
  beforeAll(async () => {
    // Start your server instance
    server = await api({ s3: { bucket: TEST_BUCKET, kms: null }, db: knex });

    // Create the test S3 bucket in LocalStack
    await s3.createBucket({ Bucket: TEST_BUCKET }).promise();
  });

  afterAll(async () => {
    // Clean up S3 bucket
    await s3.deleteBucket({ Bucket: TEST_BUCKET }).promise();

    // Destroy DB connection
    await knex.destroy();
  });

  describe('POST /', () => {
    it('should upload a file, store metadata, and return a token', async () => {
      const mockFileBuffer = Buffer.from('This is a test file');
      const fileName = 'test-file.txt';

      // Perform the POST request
      const response = await request(server)
        .post('/')
        .attach('file', mockFileBuffer, fileName);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      const { token } = response.body;

      // Verify file uploaded to S3
      const uploadedFile = await s3.getObject({
        Bucket: TEST_BUCKET,
        Key: expect.any(String) // Replace this if you need to validate exact key logic
      }).promise();

      expect(uploadedFile.Body.toString()).toBe(mockFileBuffer.toString());

      // Verify metadata in the database
      const attachmentRecord = await knex('attachment').where({ token }).first();
      expect(attachmentRecord).toBeDefined();
      expect(attachmentRecord.filename).toBe(fileName);
      expect(attachmentRecord.mimetype).toBe('text/plain');
    });
  });
});
