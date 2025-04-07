// cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Clean up local file after upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

const deleteImageFromCloudinary = async (publicUrl) => {
  try {
    const publicId = publicUrl.split(".")[2].split("/").slice(5).join("/");
    cloudinary.api
      .delete_resources(publicId)
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log(`Error 1 while deleting files ${error}`);
        return null;
      });
  } catch (error) {
    console.log(`Error 2 while deleting files ${error}`);
    return null;
  }
};

export { uploadOnCloudinary, deleteImageFromCloudinary };
