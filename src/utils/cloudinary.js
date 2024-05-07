import {v2 as cloudinary} from 'cloudinary';
import { log } from 'console';
import fs from "fs"

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY , 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


//NOW WE ARE CREATING A METHOD FOR UPLOADING FILE INTO CLOUDINARY
const uploadOnCloudinary = async (fileURL)=>{
   try {
    if(!fileURL) return console.log("Did not find the file URL or path");

   const response = await cloudinary.uploader.upload(fileURL,{
        resource_type:"auto",
    })

    //file has been uplaoded successfullu
    console.log("File is uplaoded on cloudinary", response.url);
    return response

   } catch (error) {
    //it will remove locally saved file as the upload operation got failed
    fs.unlinkSync(fileURL)
    return null;
   }
}

export  {uploadOnCloudinary};