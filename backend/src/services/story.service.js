const StoryMongo = require("../model/story.mongo");
const StoryViewMongo = require("../model/storyView.mongo");
const StoryReactionMongo = require("../model/storyReaction.mongo");
const CloseFriendsMongo = require("../model/closeFriends.mongo");
const { findUserById } = require("../model/user.model");
const { getFollowing } = require("../model/followers.model");

/**
 * Fetches active stories feed grouped by user for the current logged in user (last 24 hours only)
 */
const getActiveStoriesFeed = async (currentUserId) => {
  const numericUserId = Number(currentUserId);
  const now = new Date();

  // Query all active non-expired stories (created within last 24 hours)
  const activeStories = await StoryMongo.find({
    expiresAt: { $gt: now },
    isArchived: false,
  })
    .sort({ createdAt: 1 })
    .lean();

  // Fetch close friends list of target story authors
  const storyAuthorIds = [...new Set(activeStories.map((s) => Number(s.userId)))];
  const closeFriendsDocs = await CloseFriendsMongo.find({
    userId: { $in: storyAuthorIds },
  }).lean();

  const closeFriendsMap = {};
  closeFriendsDocs.forEach((cf) => {
    closeFriendsMap[cf.userId] = new Set((cf.friendIds || []).map(Number));
  });

  // Filter privacy restrictions
  const visibleStories = activeStories.filter((story) => {
    const ownerId = Number(story.userId);
    if (ownerId === numericUserId) return true; // Own story is always visible

    if (story.privacy === "only_me") return false;
    if (story.privacy === "close_friends") {
      const isCloseFriend = closeFriendsMap[ownerId]?.has(numericUserId);
      return Boolean(isCloseFriend);
    }
    return true; // public or followers
  });

  // Fetch viewed story IDs for current user
  const visibleStoryIds = visibleStories.map((s) => s._id);
  const viewedDocs = await StoryViewMongo.find({
    storyId: { $in: visibleStoryIds },
    viewerId: numericUserId,
  }).lean();

  const viewedStoryIdSet = new Set(viewedDocs.map((v) => v.storyId.toString()));

  // Fetch reactions for visible stories for current user
  const reactionDocs = await StoryReactionMongo.find({
    storyId: { $in: visibleStoryIds },
    userId: numericUserId,
  }).lean();

  const userReactionMap = {};
  reactionDocs.forEach((r) => {
    userReactionMap[r.storyId.toString()] = r.reaction;
  });

  // Group stories by userId
  const storiesByUserMap = {};
  visibleStories.forEach((story) => {
    const sId = story._id.toString();
    const ownerId = Number(story.userId);
    const isViewed = viewedStoryIdSet.has(sId);

    if (!storiesByUserMap[ownerId]) {
      storiesByUserMap[ownerId] = {
        userId: ownerId,
        user: null,
        stories: [],
        hasUnread: false,
        isCloseFriendStory: false,
      };
    }

    if (!isViewed) {
      storiesByUserMap[ownerId].hasUnread = true;
    }

    if (story.privacy === "close_friends") {
      storiesByUserMap[ownerId].isCloseFriendStory = true;
    }

    storiesByUserMap[ownerId].stories.push({
      ...story,
      id: sId,
      isViewed,
      userReaction: userReactionMap[sId] || null,
    });
  });

  // Fetch user profiles from PostgreSQL for all unique story authors
  const uniqueAuthorIds = Object.keys(storiesByUserMap).map(Number);
  const userProfilesMap = {};

  for (const aId of uniqueAuthorIds) {
    const user = await findUserById(aId);
    if (user) {
      userProfilesMap[aId] = {
        id: user.id,
        username: user.username,
        profile_pic: user.profile_pic || "",
      };
    }
  }

  // Build final ordered stories feed (Own story first, followed by unread stories, then read stories)
  const feedGroups = Object.values(storiesByUserMap).map((group) => ({
    ...group,
    user: userProfilesMap[group.userId] || { id: group.userId, username: "User", profile_pic: "" },
  }));

  feedGroups.sort((a, b) => {
    if (a.userId === numericUserId) return -1;
    if (b.userId === numericUserId) return 1;
    if (a.hasUnread && !b.hasUnread) return -1;
    if (!a.hasUnread && b.hasUnread) return 1;
    return 0;
  });

  return feedGroups;
};

module.exports = {
  getActiveStoriesFeed,
};
