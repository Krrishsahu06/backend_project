import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "next/dist/server/api-utils/index.js";
import {User} from "../models/user.models.js"
import {  uploadOnCloudinary } from "../utils/cloudinary.js"; 
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req,res)=>{
    //get user details from frontend according to user model
    //validation - not empty
    //check is user is already exists : check with both username and email
    //check for images and for avatar
    //if available uplaod it to cloudinary
    //create user objet as we need to send it to mongodb - create entry in db
    //remove password and refresh token for field
    //check is user creation
    //return res 

    const {fullName,username,email,password} = req.body
    // console.log("email:",email)

    // if(fullName===""){
    //     throw new ApiError(400,"Fullname is required")
    // }

    if (
        //here we are cchecking is the fields is empty
        [username,fullName,email,password].some((field)=>field.trim()==="")
    ) {
        throw new ApiError(400,"All fields are required") 
    }

    //now we will check is the user is already exists or not
    const existedUser =await User.findOne({
        $or :[
            {username},{email}
        ]
    })
    // console.log(existedUser);
    if(existedUser){
        throw new ApiError(409,"User with username or email already exists")
    }
    //now multer provide us various methods
    // console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path  //here we are checking if file exists and then checking if avatar exists in that file and then taking its path 
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    // console.log(coverImageLocalPath);

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }
3
    //now upload it into cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    //now create object and send it to db
    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "", //here we are checking if we have coverImg otherwise sending null
        email,
        password,
        username:username.toLowerCase() 

    })
    const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken" //here we are naming the fields we do not want as all fields are selected in default
    ) //here we are checking if the user is created or not
    //mongo db provided id on every entry so we use that id
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered succcessfully")
    )
}) 

export {registerUser}