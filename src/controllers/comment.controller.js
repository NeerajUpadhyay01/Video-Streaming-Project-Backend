import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  try {
    const aggregate = Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
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
                avatar: 1,
                username: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "comment",
          as: "likes",
          pipeline: [
            {
              $project: {
                _id: 1,
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
          likes:{
            $size: "$likes"
          }
        },
      },
      {
        $project: {
          content: 1,
          owner: 1,
          createdAt: 1,
          likes:1
        },
      },
    ]);

    const options = {
      page,
      limit,
    };

    const comments = await Comment.aggregatePaginate(aggregate, options);

    return res
      .status(200)
      .json(
        new ApiResponse(200, comments.docs, "Comments fetched successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          error?.message || "Something went wrong while fetching comments"
        )
      );
  }
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "content is required");
  }

  const comment = await Comment.create({
    content,
    video: req.params.videoId,
    owner: req.user._id,
  });

  const createdComment = await Comment.findById(comment._id);

  if (!createdComment) {
    throw new ApiError(500, "Something went wrong while creating the comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdComment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "content is required");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
