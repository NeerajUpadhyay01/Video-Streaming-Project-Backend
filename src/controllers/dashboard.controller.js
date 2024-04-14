import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(req.user._id),
      },
    },
  ]);

  const totalVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
  ]);

let totalViews=0;
for(const videoIndex in totalVideos){
    totalViews+=totalVideos[videoIndex].views
}

  const commentLikes = await Like.aggregate([
    {
      $match: {
        comment: { $exists: true }, // Filter only documents with the comment attribute
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "comment",
        foreignField: "_id",
        as: "commentLikes",
        pipeline: [
          {
            $match: {
              owner: new mongoose.Types.ObjectId(req.user._id),
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        commentLikes: 1,
        _id: 0,
      },
    },
  ]);

  const tweetLikes = await Like.aggregate([
    {
      $match: {
        tweet: { $exists: true }, // Filter only documents with the tweet attribute
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweetLikes",
        pipeline: [
          {
            $match: {
              owner: new mongoose.Types.ObjectId(req.user._id),
            },
          },
        ],
      },
    },
    {
      $project: {
        tweetLikes: 1,
        _id: 0,
      },
    },
  ]);

  const videoLikes = await Like.aggregate([
    {
      $match: {
        video: { $exists: true }, // Filter only documents with the video attribute
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoLikes",
        pipeline: [
          {
            $match: {
              owner: new mongoose.Types.ObjectId(req.user._id),
            },
          },
        ],
      },
    },
    {
      $project: {
        videoLikes: 1,
        _id: 0,
      },
    },
  ]);

  const stats={
    username:req.user.username,
    fullname:req.user.fullname,
    avatar:req.user.avatar,
    coverImage:req.user.coverImage,
    totalViews:totalViews,
    totalSubscribers:totalSubscribers.length,
    totalVideos:totalVideos.length,
    totalLikes:videoLikes.length + commentLikes.length +tweetLikes.length
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, stats, "channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
  ]);

  if(videos.length < 1){
    throw new ApiError(404,"no video found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "videos fetched successfuuly"));
});

export { getChannelStats, getChannelVideos };
