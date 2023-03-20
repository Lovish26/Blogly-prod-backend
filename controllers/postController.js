const Post = require("../models/PostModel");
const multer = require("multer");
const fs = require("fs");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const upload = multer({
  dest: "./uploads",
  limits: { fieldSize: 25 * 1024 * 1024 },
});

exports.uploadPostImage = upload.single("file");

// exports.setUserIds = (req, res, next) => {
//   if (!req.body.author) {
//     req.body.author = req.user.id;
//   }
// };

exports.createPost = catchAsync(async (req, res) => {
  const { originalname, path } = req.file;
  const ext = originalname.split(".")[1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { title, summary, content } = req.body;
  if (!req.body.author) req.body.author = req.user.id;

  const newPost = await Post.create({
    title,
    summary,
    content,
    cover: newPath,
    author: req.body.author,
  });
  res.status(201).json({
    status: "success",
    data: {
      newPost,
    },
  });
});

exports.editPost = catchAsync(async (req, res, next) => {
  let newPath = null;
  // If Editor has choosen cover file to be updated
  if (req.file) {
    const { originalname, path } = req.file;
    const ext = originalname.split(".")[1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { id, title, summary, content } = req.body;
  const newPost = await Post.findById(id);

  // Check if editor is same as the logged in user
  const isAuthor =
    JSON.stringify(newPost.author._id) === JSON.stringify(req.user.id);
  if (!isAuthor) {
    return next(new AppError("You are not author of this post!", 404));
  }

  // Update old data with new data
  await newPost.updateOne(
    {
      title,
      summary,
      content,
      cover: newPath ? newPath : newPost.cover,
    },
    {
      runValidators: true,
    }
  );

  res.status(200).json({
    status: "success",
  });
});

exports.getAllPosts = catchAsync(async (req, res) => {
  const queryObj = { ...req.query };
  const excludedFields = ["page", "limit"];
  excludedFields.forEach((el) => delete queryObj[el]);

  let query = Post.find(queryObj);

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 20;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const posts = await query;

  res.status(200).json({
    status: "success",
    results: posts.length,
    posts,
  });
});

exports.getPostById = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(new AppError("No Post found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      post,
    },
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const newPost = await Post.findById(req.params.id);
  // Check if editor is same as the logged in user
  const isAuthor =
    JSON.stringify(newPost.author._id) === JSON.stringify(req.user.id);
  if (!isAuthor) {
    return next(new AppError("You are not author of this post!", 404));
  }
  const post = await Post.findByIdAndDelete(req.params.id);

  if (!post) {
    return next(new AppError("No document found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
