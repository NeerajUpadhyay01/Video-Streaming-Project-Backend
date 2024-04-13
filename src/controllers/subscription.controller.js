import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel id")
    }

    const result= await Subscription.deleteOne({
        subscriber:req.user._id,
        channel:channelId
    })
    // console.log(result)

    if(!result.deletedCount){
        const subscription = await Subscription.create({
            subscriber:req.user._id,
            channel:channelId
        })

        const createdSubscription=await Subscription.findById(subscription._id)
        if(!createdSubscription){
            throw new ApiError(500,"Something went wrong while creating subscription object")
        }

        return res
        .status(200)
        .json(new ApiResponse(200,{},"channel subscribed successfully"))
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "channel unsubscribed successfully"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Invalid channel id");
    }

    const subscribers = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      fullname: 1,
                      avatar: 1,
                      _id: 0,
                    },
                  },
                ],
              },
            },
            {
              $project: {
                subscriber: 1,
                _id: 0,
              },
            },
            {
              $addFields: {
                subscriber: {
                  $first: "$subscriber",
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          subscribers: 1,
          _id:0
        },
      },
    ]);
    // console.log(subscribers)

    return res
    .status(200)
    .json(new ApiResponse(200,subscribers[0].subscribers,"subscribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
      throw new ApiError(400, "Invalid subscriber id");
    }

        const subscribedTo = await User.aggregate([
          {
            $match: {
              _id: new mongoose.Types.ObjectId(subscriberId),
            },
          },
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "subscriber",
              as: "subscribedTo",
              pipeline: [
                {
                  $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channel",
                    pipeline: [
                      {
                        $project: {
                          username: 1,
                          fullname: 1,
                          avatar: 1,
                          _id:0
                        },
                      },
                    ],
                  },
                },
                {
                    $project:{
                        channel:1,
                        _id:0
                    }
                },
                {
                    $addFields:{
                        channel:{
                            $first:"$channel"
                        }
                    }
                }
              ],
            },
          },
          {
            $project: {
              subscribedTo: 1,
            },
          },
        ]);
        // console.log(subscribedTo);

        return res
          .status(200)
          .json(new ApiResponse(200, subscribedTo[0].subscribedTo,"subscribed channels fetched successfully"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}