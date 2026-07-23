const mongoose = require("mongoose");

const storyReactionSchema = new mongoose.Schema(
  {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoryMongo",
      required: true,
      index: true,
    },
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    reaction: {
      type: String,
      enum: ["❤️", "😂", "😍", "🔥", "👏"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

storyReactionSchema.index({ storyId: 1, userId: 1 }, { unique: true });

const StoryReactionMongo = mongoose.model("StoryReactionMongo", storyReactionSchema);

module.exports = StoryReactionMongo;
