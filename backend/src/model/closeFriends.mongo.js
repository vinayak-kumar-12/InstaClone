const mongoose = require("mongoose");

const closeFriendsSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    friendIds: [
      {
        type: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CloseFriendsMongo = mongoose.model("CloseFriendsMongo", closeFriendsSchema);

module.exports = CloseFriendsMongo;
