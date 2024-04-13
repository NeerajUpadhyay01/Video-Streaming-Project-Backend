import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const result = await Like.deleteOne({
    video: videoId,
    likedBy: req.user._id,
  });
  //   console.log(result)

  if (!result.deletedCount) {
    const like = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });

    const createdLike = await Like.findById(like._id);
    if (!createdLike) {
      throw new ApiError(
        500,
        "Something went wrong while creating Like Object"
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video liked successfully"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video unliked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const result = await Like.deleteOne({
    comment: commentId,
    likedBy: req.user._id,
  });
  //   console.log(result)

  if (!result.deletedCount) {
    const like = await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });

    const createdLike = await Like.findById(like._id);
    if (!createdLike) {
      throw new ApiError(
        500,
        "Something went wrong while creating Like Object"
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment liked successfully"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment unliked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const result = await Like.deleteOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });
  //   console.log(result)

  if (!result.deletedCount) {
    const like = await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });

    const createdLike = await Like.findById(like._id);
    if (!createdLike) {
      throw new ApiError(
        500,
        "Something went wrong while creating Like Object"
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Tweet liked successfully"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet unliked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        $and: [
          {
            video: { $exists: true },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $project: {
              title: 1,
              description: 1,
              videoFile: 1,
              thumbnail: 1,
              duration: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {
          $first: "$video",
        },
      },
    },
    {
      $project: {
        video: 1,
      },
    },
  ]);
//   console.log(likedVideos);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideos,
        "All liked videos fetched successfullly"
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
