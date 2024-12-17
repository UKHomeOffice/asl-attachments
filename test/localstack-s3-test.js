/**
 * Testing S3 config can upload and download a file.
 * to test run: node localstack-s3-test.js
 * */
const fs = require('fs');
const config = require('../config');
const { S3 } = require('@asl/service/clients');

const s3Config = config.s3;
console.log(s3Config);

const settings = { s3: s3Config };

const s3 = S3(settings);

async function checkOrCreateBucket(bucketName) {
  try {
    const buckets = await s3.listBuckets().promise();

    const bucketExists = buckets.Buckets.some((bucket) => bucket.Name === bucketName);

    if (bucketExists) {
      console.log(`Bucket "${bucketName}" already exists.`);
    } else {
      console.log(`Bucket "${bucketName}" does not exist. Creating it now...`);
      await s3.createBucket({ Bucket: bucketName }).promise();
      console.log(`Bucket "${bucketName}" created successfully.`);
    }
  } catch (error) {
    console.error('Error checking or creating bucket:', error);
  }
}

// Upload a file to the bucket
async function uploadFile(bucketName, fileName) {
  try {
    const fileContent = fs.readFileSync(fileName); // Read file content
    const params = {
      Bucket: bucketName,
      Key: 'test-file.txt',
      Body: fileContent
    };

    const data = await s3.upload(params).promise();
    console.info(`File uploaded successfully. ETag: ${data.ETag}`);
  } catch (err) {
    console.error('Error uploading file:', err);
  }
}

// Download the file from S3
async function downloadFile(bucketName, fileName) {
  try {
    const params = {
      Bucket: bucketName,
      Key: 'test-file.txt'
    };

    const data = await s3.getObject(params).promise();
    fs.writeFileSync(fileName, data.Body);
    console.log('File downloaded successfully.');
  } catch (err) {
    console.error('Error downloading file:', err);
  }
}

// Test the script
async function test() {
  const bucketName = 'test-bucket';

  await checkOrCreateBucket(bucketName);
  await uploadFile(bucketName, './image/text.txt');
  await downloadFile(bucketName, 'downloaded-file.txt');
}

test();
