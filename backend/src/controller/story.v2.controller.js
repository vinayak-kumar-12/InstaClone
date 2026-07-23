const StoryMongo = require("../model/story.mongo");
const StoryViewMongo = require("../model/storyView.mongo");
const StoryReactionMongo = require("../model/storyReaction.mongo");
const StoryHighlightMongo = require("../model/storyHighlight.mongo");
const CloseFriendsMongo = require("../model/closeFriends.mongo");
const { getActiveStoriesFeed } = require("../services/story.service");
const { findUserById } = require("../model/user.model");
const { createAndEmitNotification } = require("../services/notification.service");
const { findChatBetweenUsers, createChat } = require("../model/chat.model");
const { createMessage, getMessageById } = require("../model/message.model");
const asyncHandler = require("../utils/asyncHandler");

/**
 * POST /api/stories
 * Create a new Story (Image or Video)
 */
const createStory = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { mediaUrl, mediaType = "image", caption = "", location = "", privacy = "followers", mentions = [] } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({ success: false, message: "Media URL is required." });
  }

  const story = await StoryMongo.create({
    userId: currentUserId,
    mediaUrl,
    mediaType,
    caption,
    location,
    privacy,
    mentions,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 Hours
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("story:new", { storyId: story._id, userId: currentUserId });
  }

  return res.status(201).json({
    success: true,
    message: "Story published successfully.",
    story,
  });
});

/**
 * GET /api/stories/feed
 * Fetch active stories feed for current user
 */
const getStoriesFeed = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const feed = await getActiveStoriesFeed(currentUserId);

  return res.status(200).json({
    success: true,
    feed,
  });
});

/**
 * GET /api/stories/user/:userId
 * Fetch stories for specific user
 */
const getUserStories = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.params.userId);
  const now = new Date();

  const stories = await StoryMongo.find({
    userId: targetUserId,
    expiresAt: { $gt: now },
    isArchived: false,
  }).sort({ createdAt: 1 });

  return res.status(200).json({
    success: true,
    stories,
  });
});

/**
 * POST /api/stories/view/:storyId
 * Record a story view
 */
const recordStoryView = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { storyId } = req.params;

  const story = await StoryMongo.findById(storyId);
  if (!story) {
    return res.status(404).json({ success: false, message: "Story not found." });
  }

  // Save view record (ignore duplicate error if already viewed)
  let isNewView = false;
  try {
    await StoryViewMongo.create({
      storyId: story._id,
      viewerId: currentUserId,
      storyOwnerId: story.userId,
    });
    isNewView = true;
  } catch (err) {
    // Unique index conflict: user already viewed
  }

  const viewsCount = await StoryViewMongo.countDocuments({ storyId: story._id });

  const io = req.app.get("io");
  if (io && isNewView) {
    io.to(`user_${story.userId}`).emit("story:view", {
      storyId: story._id.toString(),
      viewerId: currentUserId,
      viewsCount,
    });
  }

  return res.status(200).json({
    success: true,
    viewsCount,
  });
});

/**
 * GET /api/stories/viewers/:storyId
 * Fetch viewers list for story owner
 */
const getStoryViewers = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { storyId } = req.params;

  const story = await StoryMongo.findById(storyId);
  if (!story) {
    return res.status(404).json({ success: false, message: "Story not found." });
  }

  if (Number(story.userId) !== currentUserId) {
    return res.status(403).json({ success: false, message: "Only story owner can view viewers list." });
  }

  const views = await StoryViewMongo.find({ storyId: story._id }).sort({ viewedAt: -1 }).lean();

  const viewerIds = views.map((v) => v.viewerId);
  const viewersMap = {};

  for (const vId of viewerIds) {
    const user = await findUserById(vId);
    if (user) {
      viewersMap[vId] = {
        id: user.id,
        username: user.username,
        profile_pic: user.profile_pic || "",
      };
    }
  }

  const formattedViewers = views.map((v) => ({
    id: v._id.toString(),
    viewedAt: v.viewedAt,
    user: viewersMap[v.viewerId] || { id: v.viewerId, username: "User", profile_pic: "" },
  }));

  return res.status(200).json({
    success: true,
    count: formattedViewers.length,
    viewers: formattedViewers,
  });
});

/**
 * POST /api/stories/reaction
 * React to story with emoji
 */
const reactToStory = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { storyId, reaction } = req.body;

  const story = await StoryMongo.findById(storyId);
  if (!story) {
    return res.status(404).json({ success: false, message: "Story not found." });
  }

  // Upsert reaction
  const storyReaction = await StoryReactionMongo.findOneAndUpdate(
    { storyId: story._id, userId: currentUserId },
    { reaction },
    { upsert: true, new: true }
  );

  const io = req.app.get("io");
  if (io) {
    io.to(`user_${story.userId}`).emit("story:reaction", {
      storyId: story._id.toString(),
      userId: currentUserId,
      reaction,
    });
  }

  // Create Notification
  if (Number(story.userId) !== currentUserId) {
    createAndEmitNotification({
      recipientId: story.userId,
      senderId: currentUserId,
      type: "story_like",
      entityType: "story",
      entityId: story._id.toString(),
      title: "Story Reaction",
      message: `reacted ${reaction} to your story.`,
      image: story.mediaUrl,
      io,
    });
  }

  return res.status(200).json({
    success: true,
    reaction: storyReaction,
  });
});

/**
 * POST /api/stories/reply
 * Reply to a story via direct message
 */
const replyToStory = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { storyId, text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Reply text is required." });
  }

  const story = await StoryMongo.findById(storyId);
  if (!story) {
    return res.status(404).json({ success: false, message: "Story not found." });
  }

  // Find or Create Chat between users
  let chat = await findChatBetweenUsers(currentUserId, story.userId);
  if (!chat) {
    chat = await createChat(currentUserId, story.userId);
  }

  const messageText = `Replied to story: ${text}`;
  const createdMessage = await createMessage({
    chatId: chat.id,
    senderId: currentUserId,
    message: messageText,
  });

  const fullMessage = await getMessageById(createdMessage.id);

  const io = req.app.get("io");
  if (io) {
    io.to(`user_${story.userId}`).emit("receiveMessage", fullMessage);
    io.to(`user_${story.userId}`).emit("story:reply", {
      storyId: story._id.toString(),
      senderId: currentUserId,
      text,
    });
  }

  createAndEmitNotification({
    recipientId: story.userId,
    senderId: currentUserId,
    type: "story_reply",
    entityType: "story",
    entityId: story._id.toString(),
    title: "Story Reply",
    message: `replied to your story: "${text}"`,
    image: story.mediaUrl,
    io,
  });

  return res.status(200).json({
    success: true,
    message: "Reply sent.",
    chatId: chat.id,
  });
});

/**
 * DELETE /api/stories/:storyId
 * Delete a story
 */
const deleteStory = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { storyId } = req.params;

  const story = await StoryMongo.findOne({ _id: storyId, userId: currentUserId });
  if (!story) {
    return res.status(404).json({ success: false, message: "Story not found or unauthorized." });
  }

  await StoryMongo.deleteOne({ _id: storyId });
  await StoryViewMongo.deleteMany({ storyId });
  await StoryReactionMongo.deleteMany({ storyId });

  const io = req.app.get("io");
  if (io) {
    io.emit("story:delete", { storyId });
  }

  return res.status(200).json({
    success: true,
    message: "Story deleted.",
  });
});

/**
 * GET /api/stories/archive
 * Fetch expired stories for archive
 */
const getArchiveStories = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);

  const archivedStories = await StoryMongo.find({
    userId: currentUserId,
    $or: [{ expiresAt: { $lte: new Date() } }, { isArchived: true }],
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    stories: archivedStories,
  });
});

/**
 * Highlights Management
 */
const manageHighlights = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);

  if (req.method === "GET") {
    const highlights = await StoryHighlightMongo.find({ userId: currentUserId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, highlights });
  }

  if (req.method === "POST") {
    const { title, coverImage = "", storyIds = [] } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }

    const highlight = await StoryHighlightMongo.create({
      userId: currentUserId,
      title,
      coverImage,
      storyIds,
    });

    return res.status(201).json({ success: true, highlight });
  }
});

/**
 * Close Friends Management
 */
const manageCloseFriends = asyncHandler(async (req, res) => {
  const currentUserId = Number(req.user.id);

  if (req.method === "GET") {
    const doc = await CloseFriendsMongo.findOne({ userId: currentUserId });
    return res.status(200).json({ success: true, friendIds: doc ? doc.friendIds : [] });
  }

  if (req.method === "POST") {
    const { friendIds = [] } = req.body;
    const doc = await CloseFriendsMongo.findOneAndUpdate(
      { userId: currentUserId },
      { friendIds },
      { upsert: true, new: true }
    );
    return res.status(200).json({ success: true, friendIds: doc.friendIds });
  }
});

module.exports = {
  createStory,
  getStoriesFeed,
  getUserStories,
  recordStoryView,
  getStoryViewers,
  reactToStory,
  replyToStory,
  deleteStory,
  getArchiveStories,
  manageHighlights,
  manageCloseFriends,
};
