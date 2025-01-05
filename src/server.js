const express = require("express");
const morgan = require("morgan");
const streamController = require("./controllers/stream");
const searchController = require("./controllers/search");
const moviesController = require("./controllers/movies");
const historyController = require("./controllers/history");
const tvController = require("./controllers/tv");

const app = express();

app.set("view engine", "ejs");
app.set("views", "src/templates");

app.use(express.static("src/public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// app.use("/stream", streamController);
app.use("/", searchController);
app.use("/movies", moviesController);
app.use("/stream", streamController);
app.use("/history", historyController);
app.use("/tv", tvController);

app.get("/health", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send("ok");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});