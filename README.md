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
curl -X POST http://localhost:8092 -F "file=@/image/location.jpg"
// i.e file save in root/test/image/location.jpg
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
