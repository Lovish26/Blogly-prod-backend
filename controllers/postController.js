const Post = require("../models/PostModel");
const multer = require("multer");
const fs = require("fs");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto"); //
const sharp = require("sharp"); //
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3"); //
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
});

exports.uploadPostImage = upload.single("file");

exports.createPost = catchAsync(async (req, res) => {
  //resize image
  const buffer = await sharp(req.file.buffer)
    .resize({ width: 1200, height: 550 })
    .toBuffer();

  const imageName = randomImageName();

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: imageName,
    Body: buffer,
    ContentType: req.file.mimetype,
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  const { title, summary, content } = req.body;
  if (!req.body.author) req.body.author = req.user.id;

  const newPost = await Post.create({
    title,
    summary,
    content,
    cover: imageName,
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
  const { id, title, summary, content } = req.body;
  const newPost = await Post.findById(id);

  // Check if editor is same as the logged in user
  const isAuthor =
    JSON.stringify(newPost.author._id) === JSON.stringify(req.user.id);
  if (!isAuthor) {
    return next(new AppError("You are not author of this post!", 404));
  }

  let newImageName = newPost.cover;
  // If Editor has choosen cover file to be updated
  if (req.file) {
    // Delete old image file from S3 bucket
    const deleteObjectParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: newPost.cover,
    };
    const deleteCommand = new DeleteObjectCommand(deleteObjectParams);
    await s3.send(deleteCommand);

    // Generate new image name and upload new image file to S3 bucket
    newImageName = randomImageName();
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 1200, height: 550 })
      .toBuffer();

    const uploadParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: newImageName,
      Body: buffer,
      ContentType: req.file.mimetype,
    };

    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3.send(uploadCommand);
  }

  // Update old data with new data
  await newPost.updateOne(
    {
      title,
      summary,
      content,
      cover: newImageName ? newImageName : newPost.cover,
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

  for (const post of posts) {
    const getObjectParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: post.cover,
    };
    const command = new GetObjectCommand(getObjectParams); //
    const url = await getSignedUrl(s3, command, {}); // this empty object here prevents from setting default expiresIn value to 15min if u want to display images forever.
    post.imageUrl = url;
  }

  let results = await Post.find();
  results = results.length;

  res.status(200).json({
    status: "success",
    results,
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

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: newPost.cover,
  };
  const command = new DeleteObjectCommand(params);
  await s3.send(command);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
