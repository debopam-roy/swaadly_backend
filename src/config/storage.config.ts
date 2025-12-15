import { Storage } from '@google-cloud/storage';


export const storage = new Storage({
  apiEndpoint: process.env.GCS_EMULATOR_HOST || 'http://localhost:4443',
  projectId: process.env.GCS_PROJECT_ID || 'swaadly-dev',
}
);

export const bucketName = process.env.GCS_BUCKET_NAME || 'swaadly-images';

export const bucket = storage.bucket(bucketName);

export const storageConfig = {
  storage,
  bucket,
  bucketName,
};
