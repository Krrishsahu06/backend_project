import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.models.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    if (!videoId.trim()) {
        throw new ApiError(400, "Invalid user id");
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"Video with requested videoId not exist")
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:_id,
                as:"owner",
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },
                owner:{
                    $first:"$owner"
                },
                isLiked:{
                    $cond:{
                        if:{$in :[req.user?._id,"likes.likedBy"]}, //here likes is the database and in that likedBy is a field
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $sort:{
                createdAt:-1,
            }
        },
        {
            $project:{
                likesCount:1,
                content:1,
                createdAt:1,
                owner:{
                    username:1,
                    fullName:1,
                    "avatar.url":1,
                },
                isLiked:1
            }
        }
    ]);
    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    };
    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );
    return res.status(200)
    .json(new ApiResponse(200,comments,"Comments fetched Successfully"));

});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {cmnt} = req.body;

    if(!videoId.trim()){
        return new ApiError(400,"Invalid video ID")
    }
    const video = await Video.findById(videoId);
    if (!video) {
        return new ApiError(400,"No video exist with this ID")
    }
    if (!cmnt) {
        return new ApiError(400,"Comment content is required")
    }
    const comment = await Comment.create({
        content:cmnt,
        video:videoId,
        owner:req.user?._id
    })
    if(!comment){
        return new ApiError(400,"Failed to add comment please try again")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,comment,"Comment added successfully"))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {content} = req.body;

    if(!content){
        return new ApiError(400,"Comment content is required")
    }
    const comment = await Comment.findById(commentId);
    if(!commentId){
        return new ApiError(400,"No comment exists")
    }
    if(comment?.owner.toString()!== req.user?._id.toString()){
        return new ApiError(400,"Only comment owner can edit the comment ")
    }
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content
            }
        },
        {new:true}
    )
    return res
    .status(200)
    .json( new ApiResponse(200,updatedComment,"Comment has been successfully updated"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;
    const comment = await Comment.findById(commentId);
    if(!comment){
        return new ApiError(400,"No comment exists")
    }
    if(comment?.owner.toString()!== req.user?._id.toString()){
        return new ApiError(400,"Only comment owner can delete the comment")
    }
    const deletedComment = await Comment.findByIdAndDelete(
        commentId
    )
    await Like.deleteMany({
        comment:commentId,
        likedBy:req.user
    })
    return res
    .status(200)
    .json(new ApiResponse(200,{commentId},"Comment and likes assosiated with it is deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }