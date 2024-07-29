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
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "asce",
    // userId,
  } = req.query;
  //TODO: get all videos based on query, sort, pagination

  try {
    const pipeline = [];

    // if (!userId) {
    //   throw new ApiError(400, "User Id not provided");
    // }

    // if (!isValidObjectId(userId)) {
    //   throw new ApiError(400, "Invalid User Id");
    // }

    // if (userId) {
    //   pipeline.push({
    //     $match: {
    //       owner: new mongoose.Types.ObjectId(userId),
    //     },
    //   });
    // }

    if (query) {
      pipeline.push({
        $match: {
          title: {
            $regex: query || "",
            $options: "i",
          },
        },
      });
    }

    // pipeline.push({ $match: { isPublished: true } });

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
                _id: 1,
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

    const sortOption = {};
    sortOption[sortBy] = sortType === "asc" ? 1 : -1;

    pipeline.push({
      $sort: sortOption,
    });

    // Facet for pagination
    pipeline.push({
      $facet: {
        metadata: [
          { $count: "total" },
          {
            $addFields: {
              page: parseInt(page, 10),
              limit: parseInt(limit, 10),
            },
          },
        ],
        data: [{ $skip: (page - 1) * limit }, { $limit: parseInt(limit, 10) }], // add projection here if needed
      },
    });

    const results = await Video.aggregate(pipeline);
    const videos = results[0].data;
    const metadata = results[0].metadata[0] || {
      total: 0,
      page: 1,
      limit: parseInt(limit, 10),
    };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { videos, metadata },
          "Videos fetched successfully"
        )
      );
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
  const userId = req.user._id;
  //TODO: get video by id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likes: {
          $size: "$likes",
        },
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        let: {
          ownerId: "$owner._id",
          userId: new mongoose.Types.ObjectId(userId),
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$channel", "$$ownerId"] },
                  { $eq: ["$subscriber", "$$userId"] },
                ],
              },
            },
          },
        ],
        as: "isSubscribed",
      },
    },
    {
      $addFields: {
        isSubscribed: {
          $cond: {
            if: { $gt: [{ $size: "$isSubscribed" }, 0] },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);

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

const getVideos = asyncHandler(async (req, res) => {
  const options = {
    page: 1,
    limit: 10,
  };

  const videos = await Video.aggregatePaginate(
    Video.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                avatar: 1,
                fullname: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          owner: {
            $arrayElemAt: ["$owner", 0],
          },
        },
      },
    ]),
    options
  );

  if (!videos) {
    throw new ApiError(500, "Something went wrong!!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos.docs, "Videos fetched successfully"));
});

const increamentViews = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.findById(videoId);

  video.views += 1; 
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video views increased successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getVideos,
  increamentViews,
};
