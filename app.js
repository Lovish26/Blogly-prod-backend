const express = require("express");
const path = require("path");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const userRouter = require("./routes/userRoutes");
const postRouter = require("./routes/postRoutes");
const globalErrorHandler = require("./controllers/errorController");

// Starts express app
const app = express();

app.enable("trust proxy", 1);

// 1) GLOBAL MIDDLEWARES
// Implement cors

app.use(cors({ credentials: true , origin: process.env.BASE_URL }));
app.options("*", cors());

// Serving static files
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

//  Set Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Development Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limits no. of requests for api's for single IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body parser, reading data from body in req.body
app.use(express.json());
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

app.use(compression());

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);

app.use(globalErrorHandler);

module.exports = app;
