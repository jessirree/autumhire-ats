// One-off utility: applies cors.json to the Firebase Storage bucket using a
// service account key, as an alternative to gsutil/Cloud Shell.
// Usage: node scripts/set-storage-cors.cjs path/to/serviceAccountKey.json
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: node scripts/set-storage-cors.cjs path/to/serviceAccountKey.json');
  process.exit(1);
}

const corsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cors.json'), 'utf8'));
const storage = new Storage({ keyFilename: keyPath });
const bucketName = 'autumhire2-4a087.firebasestorage.app';

storage.bucket(bucketName).setCorsConfiguration(corsConfig)
  .then(() => console.log(`CORS configuration applied to gs://${bucketName}`))
  .catch((err) => {
    console.error('Failed to set CORS:', err.message);
    process.exit(1);
  });
