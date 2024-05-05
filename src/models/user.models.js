import mongoose , {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";


const userSchema = Schema(
    {
        username:{
            type: String,
            unique: true,
            required: true,
            lowercase: true,
            trim: true,
            index:true 
        },
        email:{
            type: String,
            unique: true,
            required: true,
            lowercase: true,
            trim: true,
        },
        fullname:{
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index:true,
        },
        avatar:{
            type:String, //cloudinary url
            required:true,
        },
        coverImage:{
            type: String
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String,
            required:[true,'password is required']
            //Here we used bcrypt library for encryptiying password
        },
        refreshToken:{
            type:String
        }
    },{timestamps:true}
)

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next; //here we are checking if password field is modified 
    this.password= bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function () {
   return jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateRefreshToken = function () {
        return jwt.sign({
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userSchema)