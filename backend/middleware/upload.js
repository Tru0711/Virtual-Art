const multer = require('multer');

const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const createUploader = (options = {}) => {
  const { allowedMimes = imageMimes, maxSize = 5 * 1024 * 1024, errorMessage = 'Only image files are allowed.' } = options;
  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(errorMessage), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSize }
  });
};

const profileUpload = createUploader({
  maxSize: 5 * 1024 * 1024,
  errorMessage: 'Invalid image type. Only jpg, jpeg, png, webp, gif allowed.'
});
const artworkUpload = createUploader({
  maxSize: 5 * 1024 * 1024,
  errorMessage: 'Invalid image type. Only jpg, jpeg, png, webp allowed.'
});
const signatureUpload = createUploader({
  allowedMimes: ['image/png'],
  maxSize: 2 * 1024 * 1024,
  errorMessage: 'Signature must be a PNG with transparent background.'
});

const upload = profileUpload;
upload.profileUpload = profileUpload;
upload.artworkUpload = artworkUpload;
upload.signatureUpload = signatureUpload;

module.exports = upload;
