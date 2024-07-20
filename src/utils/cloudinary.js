import { v2 as cloudinary } from "cloudinary";
import fs  from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        if (response.url.startsWith("http://")) {
           response.url = response.url.replace("http://", "https://");
        }
        //file has been uploaded  successfully
        // console.log("FIle is uploaded on  Cloudinary",response.url)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary files as the upload operation got failed 
        return null
    }
}

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

export {uploadOnCloudinary,deleteImageFromCloudinary}

