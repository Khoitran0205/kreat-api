const { cloudinary } = require('../../utils/cloudinary');

// [POST] /cloudinary/upload
exports.cloudinary_upload = async (req, res, next) => {
  try {
    const fileStr = req.body.data;
    const uploadedResponse = await cloudinary.uploader.upload(fileStr, { upload_preset: 'dev_setups' });
    res.status(201).json({
      message: 'image uploaded successfully',
      uploadedResponse,
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};
