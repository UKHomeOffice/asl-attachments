try {
  // eslint-disable-next-line
  require('dotenv').config();
} catch (e) {
  /* swallow error */
}

const args = require('minimist')(process.argv.slice(2));
const db = require('../asl-schema');
const isUUID = require('uuid-validate');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const { S3 } = require('@asl/service/clients');

const config = require('../config');

const versionId = args._[0];

const models = db(config.db);
const s3 = S3(config);

const { ProjectVersion, Attachment } = models;

const USAGE = `

Usage:
  node scripts/migrate.js <versionId>

`;

if (!versionId || !isUUID(versionId)) {
  console.error(USAGE);
  process.exit(1);
}

const loadVersion = async id => {
  console.log(`Loading data for versionId: ${id}`);
  const result = await ProjectVersion.query().select('data').where({ id }).first();
  if (!result) {
    throw new Error(`Project version with id: ${id} could not be found`);
  }
  return result.data;
};
const traverseVersion = async (id, data) => {
  console.log(`Traversing data for versionId: ${id}`);
  return traverse(data);
};

const traverse = async obj => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.reduce(async (arr, elm) => {
      return [
        ...(await arr),
        await traverse(elm)
      ];
    }, []);
  }
  if (obj.type === 'image' && obj.object === 'block') {
    obj.data = await saveImage(obj.data);
    return obj;
  }
  return Object.keys(obj).reduce(async (result, key) => {
    return {
      ...(await result),
      [key]: await traverse(obj[key])
    };
  }, {});
};

const saveImage = async data => {
  console.log('Found image...');
  if (!data.src && data.token) {
    console.log('Image in S3, no action required');
    return data;
  }
  if (!data.src.match(/^data:/)) {
    console.log('Image does not have `data:` url schema, skipping.');
    return data;
  }
  const mimetype = data.src.split(';')[0].replace('data:', '');
  const id = uuid();
  const token = crypto.randomBytes(64).toString('hex');
  const buffer = Buffer.from(data.src.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  console.log(`Saving image type: ${mimetype} to S3...`);
  await new Promise((resolve, reject) => {
    const params = {
      Bucket: config.s3.bucket,
      Key: id,
      Body: buffer,
      ContentEncoding: 'base64',
      ContentType: mimetype,
      ServerSideEncryption: config.s3.kms ? 'aws:kms' : undefined,
      SSEKMSKeyId: config.s3.kms
    };
    s3.putObject(params, (err, data) => err ? reject(err) : resolve());
  });
  await Attachment.query().insert({ id, token, mimetype, filename: `unknown.${mimetype.split('/')[1]}` });
  console.log(`Saved with id: ${id}`);
  return { token };
};

const saveVersion = async (id, data) => {
  console.log(`Saving data for versionId: ${id}`);
  return ProjectVersion.query().update({ data }).where({ id });
};

Promise.resolve()
  .then(() => loadVersion(versionId))
  .then(data => traverseVersion(versionId, data))
  .then(data => saveVersion(versionId, data))
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error(err.stack);
    process.exit(1);
  });
