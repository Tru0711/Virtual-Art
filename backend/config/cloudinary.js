const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const uploadBuffer = (buffer, options = {}) => {
  if (!isCloudinaryConfigured) {
    return Promise.reject(new Error('Cloudinary is not configured'));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });

    Readable.from(buffer).pipe(stream);
  });
};

const getPublicIdFromUrl = (url) => {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.indexOf('upload');

    if (uploadIndex === -1 || uploadIndex + 2 >= segments.length) {
      return null;
    }

    const publicIdWithExtension = segments.slice(uploadIndex + 2).join('/');
    return publicIdWithExtension.replace(/\.[^.]+$/, '');
  } catch (error) {
    return null;
  }
};

module.exports = {
  cloudinary,
  getPublicIdFromUrl,
  isCloudinaryConfigured,
  uploadBuffer,
};