const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    caption: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    privacy: {
      type: String,
      enum: ["public", "followers", "close_friends", "only_me"],
      default: "followers",
    },
    mentions: [
      {
        type: Number,
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

storySchema.index({ userId: 1, expiresAt: -1 });
storySchema.index({ expiresAt: 1 });

const StoryMongo = mongoose.model("StoryMongo", storySchema);

module.exports = StoryMongo;
