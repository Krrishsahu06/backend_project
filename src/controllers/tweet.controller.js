import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
// import { User } from "../models/user.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { tweetContent } = req.body;
  if (!tweetContent) {
    throw new ApiError(404, "Field cannot be empty");
  }
  if (!req.user._id) {
    throw new ApiError(404, "No user id available");
  }
  const tweet = await Tweet.create({
    owner: req.user?._id,
    content: tweetContent,
  });
  const createdTweet = await Tweet.findById(tweet._id);
  if (!createdTweet) {
    throw new ApiError(404, "Something went wrong while creating tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { content } = req.body;
  const { tweetId } = req.params;
  if (!content) {
    throw new ApiError(400, "UpdatedTweet must be provided");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(400, "Tweet not found");
  }
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Only the tweet owner can make updates");
  }
  const newTweet = await Tweet.findByIdAndUpdate(
    req.params.tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!newTweet) {
    throw new ApiError(400, "Something went wrong while updating tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200), newTweet, "Tweet has been updated");
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!userId.trim()) {
    throw new ApiError(400, "Invalid user id");
  }
  const userTweets = Tweet.aggregate([
    {
      $match: {
        owner: userId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "owner",
        foreignField: "tweet",
        as: "likeDetails",
        pipeline: [
          {
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likeDetails",
        },
        ownerDetails: {
          $first: "$ownerDetails",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [req.user?._id,"$likeDetails.likedBy"],
            },
            then:true,
            else:false
          },
        },
      },
    },
    {
        $sort:{
            createdAt:-1
        }
    },
    {
        $project:{
            content:1,
            ownerDetails:1,
            likeDetails:1,
            createdAt:1,
            isLiked:1
        }
    }
  ]);

  return res
  .status(200)
  .json(new ApiResponse(200,userTweets,"Tweets fetched successfully"))
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(400, "No tweet with this id found");
  }
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Invalid user");
  }
  await Tweet.findByIdAndDelete(tweetId);
  return res
    .status(200)
    .json(new ApiResponse(200, { tweetId }, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
