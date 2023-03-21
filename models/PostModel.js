const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: [true, "Title is required!"],
      minLength: [10, "Title should have minimum 10 characters."],
      maxLength: [50, "Title can have maximum 50 characters."],
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "Summary is required!"],
      minLength: [50, "Summary should have minimum 50 characters."],
      maxLength: [500, "Summary can have maximum 500 characters."],
    },
    content: {
      type: String,
      trim: true,
      required: [true, "Content is required!"],
      minLength: [1000, "Content should have minimum 1000 characters."],
    },
    cover: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
    timestamps: true,
  }
);

postSchema.pre(/^find/, function (next) {
  this.select("-__v")
    .populate({
      path: "author",
      select: "-__v",
    })
    .sort({ createdAt: -1 });
  next();
});

const Post = new mongoose.model("Post", postSchema);

module.exports = Post;
