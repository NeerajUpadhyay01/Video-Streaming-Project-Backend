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

  let totalViews = 0;
  for (const videoIndex in totalVideos) {
    totalViews += totalVideos[videoIndex].views;
  }

  const comments = await Like.aggregate([
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
        as: "commentLike",
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
        commentLike: 1,
        _id: 0,
      },
    },
  ]);
  // console.log(comments);

  const tweets = await Like.aggregate([
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
        as: "tweetLike",
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
        tweetLike: 1,
        _id: 0,
      },
    },
  ]);

  const videos = await Like.aggregate([
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
        as: "videoLike",
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
        videoLike: 1,
        _id: 0,
      },
    },
  ]);

  let commentLikes = 0;
  let videoLikes = 0;
  let tweetLikes = 0;

  for (const comment in comments) {
    if (comments[comment].commentLike.length >0) {
      commentLikes += 1;
    }
  }
  for (const tweet in tweets) {
    if (tweets[tweet].tweetLike.length>0) {
      tweetLikes += 1;
    }
  }
  for (const video in videos) {
    if (videos[video].videoLike.length > 0) {
      videoLikes += 1;
    }
  }

  const totalLikes = videoLikes + commentLikes + tweetLikes;

  const stats = {
    username: req.user.username,
    fullname: req.user.fullname,
    avatar: req.user.avatar,
    coverImage: req.user.coverImage,
    totalViews: totalViews,
    totalSubscribers: totalSubscribers.length,
    totalVideos: totalVideos.length,
    totalLikes: totalLikes,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "channel stats fetched successfully"));
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
