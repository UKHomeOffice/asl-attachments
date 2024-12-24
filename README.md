# asl-attachments

## About

Microservice for proving S3 storage of attachments

## Usage

### To run a local instance:

```
npm run dev
```

### Uploading a file
This will return a response with a token to identify the attachment
```
cd to the folder where you have file i.e test/image/
curl -X POST http://localhost:8092 -F "file=@location.jpg"  
```
Result:
```
{
    "token":"acbdef123"
}
```

### Download a file

Using the token returned by the upload
```
http://localhost:8092/acbdef123
```

### Testing localstack
```
cd test
```
```
node localstack-s3-test.js
```
on success
```
Bucket "test-bucket" already exists.
File uploaded successfully. ETag: "13a079f47499a790d07a5b607798bf06"
File downloaded successfully.
```
