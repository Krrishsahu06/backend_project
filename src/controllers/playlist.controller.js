import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //TODO: create playlist
  const { name, description } = req.body;
  if (!name || !description) {
    return new ApiError(400, "Name and description both are required");
  }
  const playList = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });
  if (!playList) {
    return new ApiError(400, "Failed to create the playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Playlist created successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  const playList = await Playlist.findById(playlistId);
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }
  if (!playList) {
    return new ApiError(400, "Error playlist not found");
  }
  if (playList?.owner.toString() !== req.user?._id.toString()) {
    return new ApiError(400, "Only playlist created can delete it");
  }
  const deletedPlayList = await Playlist.findByIdAndDelete(playlistId);
  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedPlayList, "Playlist Deleted successfully")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  if (!name || !description) {
    return new ApiError(400, "Name and description both are required");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  const playList = await Playlist.findById(playlistId);
  if (!playList) {
    return new ApiError(400, " Playlist not found");
  }

  if (playList?.owner.toString() !== req.user?._id.toString()) {
    return new ApiError(400, "Only playlist created can update it");
  }
  const updatedPlayList = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      name,
      description,
    },
    { new: true }
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlayList, "Playlist updated successfully")
    );
  //TODO: update playlist
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError("Invalid playlist or video id");
  }
  const [playlist, video] = await Promise.all([
    Playlist.findById(playlistId),
    Video.findById(videoId),
  ]);
  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }
  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  if (playlist?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError("Only owner can update the playlist");
  }
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        video: videoId,
      },
    },
    { new: true }
  );
  if (!updatePlaylist) {
    return new ApiError(400, "Failed to update the playlist");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video added to playlist successfully"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  // TODO: remove video from playlist
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError("Invalid playlist or video id");
  }
  const [playlist, video] = await Promise.all([
    Playlist.findById(playlistId),
    Video.findById(videoId),
  ]);
  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }
  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  if (playlist?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError("Only owner can remove video from the playlist");
  }
  const updatedPlaylist = await Playlist.findByIdAndDelete(
    playlistId,
    {
      $pull: {
        videos: videoId,
      },
    },
    { new: true }
  );
  if (!updatedPlaylist) {
    return new ApiError(400, "Failed to delete video from the playlist");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video deleted from playlist successfully"
      )
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  //TODO: get user playlists
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    return new ApiError(400, "Invalid user id");
  }
  const userPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, userPlaylists, "User playlist fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  //TODO: get playlist by id
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    return new ApiError(400, "Invalid playlist id");
  }
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    return new ApiError(404, "Can't find the playlist");
  }
  const playlistVideos = Playlist.aggregate([
    {
      $match: new mongoose.Types.ObjectId(playlistId),
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $unwind: "$videos",
    },
    {
      $match: {
        "videos.isPublished": true,
      },
    },
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        description: { $first: "$description" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        owner: { $first: "$owner" },
        videos: { $push: "$videos" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "videos",
        },
        totalViews: {
          $sum: "&videos.views",
        },
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        updatedAt: 1,
        createdAt: 1,
        totalVideos: 1,
        totalViews: 1,
        videos: {
          _id: 1,
          title: 1,
          description: 1,
          duration: 1,
          createdAt: 1,
          views: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
        },
        owner: {
          username: 1,
          fullname: 1,
          "avatar.url": 1,
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlistVideos, "Successfully fethched the playlist")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
