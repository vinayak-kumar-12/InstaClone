const mongoose = require("mongoose");

const storyViewSchema = new mongoose.Schema(
  {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoryMongo",
      required: true,
      index: true,
    },
    viewerId: {
      type: Number,
      required: true,
      index: true,
    },
    storyOwnerId: {
      type: Number,
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate view logs per viewer per story
storyViewSchema.index({ storyId: 1, viewerId: 1 }, { unique: true });

const StoryViewMongo = mongoose.model("StoryViewMongo", storyViewSchema);

module.exports = StoryViewMongo;
