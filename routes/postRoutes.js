const express = require("express");
const postController = require("../controllers/postController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post(
  "/",
  authController.protect,
  postController.uploadPostImage,
  postController.createPost
);
router.put(
  "/",
  authController.protect,
  postController.uploadPostImage,
  postController.editPost
);
router.get("/", postController.getAllPosts);
router.get("/post/:id", postController.getPostById);
router.delete("/:id", authController.protect, postController.deletePost);

module.exports = router;
