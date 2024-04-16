import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteImageFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  try {
    const pipeline = [];

    if (!userId) {
      throw new ApiError(400, "User Id not provided");
    }

    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid User Id");
    }

    if (userId) {
      pipeline.push({
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      });
    }

    if (query) {
      pipeline.push({
        $match: {
          title: {
            $regex: query,
          },
        },
      });
    }

    pipeline.push({ $match: { isPublished: true } });

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$owner",
      }
    );

    const aggregate = Video.aggregate(pipeline);

    const options = {
      page,
      limit,
      sort: {
        [sortBy]: sortType,
      },
    };

    const videos = await Video.aggregatePaginate(aggregate, options);

    return res
      .status(200)
      .json(new ApiResponse(200, videos.docs, "Videos fetched successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          error?.message || "Something went wrong while fetching videos"
        )
      );
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if ([title, description].some((field) => field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!(videoFileLocalPath || thumbnailLocalPath)) {
    throw new ApiError(400, "videoFile or thumbnail is missing");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!(videoFile || thumbnail)) {
    throw new ApiError(400, "videoFile or thumbnail is missing");
  }
  // console.log(videoFile)

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: req.user._id,
    isPublished: true,
    duration: videoFile.duration,
  });

  const createdVideo = await Video.findById(video._id);

  if (!createdVideo) {
    throw new ApiError(500, "Something went wrong while creating the video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, createdVideo, "video is published is successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched successsfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const { title, description } = req.body;

  if ([title, description].some((field) => field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail is missing");
  }

  const oldVideo = await Video.findById(videoId);

  const oldThumbnail = oldVideo.thumbnail;

  const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!newThumbnail) {
    throw new ApiError(400, "thumbnail is missing");
  }

  await deleteImageFromCloudinary(oldThumbnail);

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: newThumbnail.url,
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Video not found after updating the details");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "No video with given id exists");
  }

  await Video.findByIdAndDelete(videoId);

  await deleteImageFromCloudinary(video.videoFile);
  await deleteImageFromCloudinary(video.thumbnail);

  await Comment.deleteMany({ video: videoId });

  await Like.deleteMany({ video: videoId });

  try {
    const playlists = await Playlist.find({ videos: videoId });

    const promises = playlists.map(async (playlist) => {
      playlist.videos = playlist.videos.filter(
        (id) => id.toString() !== videoId.toString()
      );

      await playlist.save({ validateBeforeSave: false });
    });

    await Promise.all(promises);
  } catch (error) {
    throw new ApiError(
      500,
      `Error while removing video from playlists: ${error.message}`
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "video deleted and removed from all playlists, Also likes and comments associated with the video removed successfully"
      )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Publish status toggled successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
