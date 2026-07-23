const mongoose = require("mongoose");

const storyHighlightSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
      default: "",
    },
    storyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StoryMongo",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const StoryHighlightMongo = mongoose.model("StoryHighlightMongo", storyHighlightSchema);

module.exports = StoryHighlightMongo;
