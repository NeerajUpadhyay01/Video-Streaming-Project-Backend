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
    const urlParts = new URL(publicUrl);
    const pathname = urlParts.pathname;

    // Get filename (last part) and extension
    const fileName = pathname.split("/").pop(); // e.g. "my-video.mp4"
    const extension = fileName.split(".").pop().toLowerCase();

    // Determine resource type based on extension
    let resourceType = "image"; // default
    const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm"];
    const rawExtensions = ["pdf", "docx", "zip", "txt"];

    if (videoExtensions.includes(extension)) {
      resourceType = "video";
    } else if (rawExtensions.includes(extension)) {
      resourceType = "raw";
    }

    // Extract publicId (strip version & extension)
    const publicIdWithExt = pathname.split("/").slice(2).join("/"); // remove /vxxxx/
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // remove file extension

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteImageFromCloudinary };
