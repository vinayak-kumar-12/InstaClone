const {
  createComment,
  getCommentsByPost,
  getCommentById,
  updateComment,
  deleteComment,
  getPostCommentsCount,
} = require("../model/comments.model");
const { getPostById } = require("../model/post.model");
const { createAndEmitNotification } = require("../services/notification.service");

const addComment = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { postId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Comment is required.",
      });
    }

    const newComment = await createComment(user_id, postId, comment);

    // Get live comment count from database
    const commentsCount = await getPostCommentsCount(postId);

    // Build full comment object with author details
    const fullComment = {
      id: newComment.id,
      comment: newComment.comment,
      created_at: newComment.created_at,
      updated_at: newComment.updated_at,
      user_id: user_id,
      username: req.user.username,
      profile_pic: req.user.profilePic || req.user.profile_pic || "",
    };

    // Emit live Socket.IO update
    const io = req.app.get("io");
    if (io) {
      io.emit("postCommentUpdate", {
        postId: Number(postId),
        commentsCount,
        comment: fullComment,
        type: "add",
      });
    }

    // Trigger Notification to Post Owner
    const post = await getPostById(postId, user_id);
    if (post && post.user_id) {
      createAndEmitNotification({
        recipientId: post.user_id,
        senderId: user_id,
        type: "comment",
        entityType: "post",
        entityId: postId,
        title: "New Comment",
        message: `commented: "${comment.slice(0, 40)}${comment.length > 40 ? "..." : ""}"`,
        image: post.media_url || "",
        metadata: { commentId: newComment.id, commentText: comment },
        io,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: fullComment,
      commentsCount,
    });
  } catch (error) {
    console.error("Add Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await getCommentsByPost(postId);

    return res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error("Get Comments Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { comment } = req.body;

    const existingComment = await getCommentById(commentId);

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const updatedComment = await updateComment(commentId, comment);

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully.",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Update Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const removeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const existingComment = await getCommentById(commentId);

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const postId = existingComment.post_id;

    await deleteComment(commentId);

    // Get live comment count from database
    const commentsCount = await getPostCommentsCount(postId);

    // Emit live Socket.IO update
    const io = req.app.get("io");
    if (io) {
      io.emit("postCommentUpdate", {
        postId: Number(postId),
        commentsCount,
        commentId: Number(commentId),
        type: "delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
      commentsCount,
    });
  } catch (error) {
    console.error("Delete Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addComment,
  getComments,
  editComment,
  removeComment,
};