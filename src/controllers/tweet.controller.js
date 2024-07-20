import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} =req.body

    if(!content){
        throw new ApiError(400,"content is required")
    }

    const tweet=await Tweet.create({
        content,
        owner: req.user._id
    })

    const createdTweet= await Tweet.findById(tweet._id)

    if(!createdTweet){
        throw new ApiError(500,"Something went wrong while creating the tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,createdTweet,"tweet created successfully"))
    
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} =req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid user id")
    }

    const tweets=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"tweets",
                localField:"_id",
                foreignField:"owner",
                as:"tweets",
                pipeline:[
                    {
                        $lookup:{
                            from:"likes",
                            localField:"_id",
                            foreignField:"tweet",
                            as:"likes",
                        }
                    },
                    {
                        $addFields:{
                            likes:{
                                $size:"$likes"
                            }
                        }
                    },
                    {
                        $project:{
                            likes:1,
                            content:1,
                            createdAt:1
                        }
                    }
                ]
            }
        },
        {
            $project:{
                tweets:1,
                username:1,
                fullname:1,
                avatar:1
            }
        }
    ])


    return res
    .status(200)
    .json(new ApiResponse(200,tweets[0],"tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} =req.params

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Invalid tweet id");
    }

    const {content} =req.body

    if(!content){
        throw new ApiError(400,"content is required")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetId,
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
    .json(new ApiResponse(200,updatedTweet,"tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Invalid tweet id");
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Tweet deleted succesfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
