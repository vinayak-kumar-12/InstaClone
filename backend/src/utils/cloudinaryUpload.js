const cloudinary = require("../config/cloudinary");

/**
 * Uploads a file buffer from memory storage to Cloudinary using upload_stream
 * @param {Buffer} fileBuffer - The file buffer provided by Multer
 * @param {string} folder - The Cloudinary folder where the media should be stored
 * @returns {Promise<Object>} - Promise resolving to the Cloudinary upload result
 */
const uploadStream = (fileBuffer, folder = "instaclone/posts") => {
  return new Promise((resolve, reject) => {
    const uploadStreamInstance = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto", // Automatically detect media type (image, video, etc.)
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    // Write the buffer contents to the stream and finish
    uploadStreamInstance.end(fileBuffer);
  });
};

module.exports = {
  uploadStream,
};
