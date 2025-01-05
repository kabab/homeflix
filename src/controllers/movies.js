const express = require("express");
const tmdbAdapter = require("../adapters/tmdb");
const TorrentSearchApi = require('torrent-search-api');
const _ = require('lodash');
const fastLevenshtein = require("fast-levenshtein")
const prisma = require("../lib/prisma");
const torrentService = require("../services/torrent");

TorrentSearchApi.enableProvider("Yts");
TorrentSearchApi.enableProvider("ThePirateBay");
TorrentSearchApi.enableProvider("1337x");

const router = express.Router();

const formatRuntime = (runtime) => {
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return `${hours}h${minutes}m`;
};

router.get("/:movieId", async (req, res) => {
  const movieId = req.params.movieId;
  const movie = await tmdbAdapter.getMovie(movieId);
  movie.runtime = formatRuntime(movie.runtime);

  const history = await prisma.movieHistory.findFirst({
    where: {
      movieId: parseInt(movieId),
    }
  });

  let watchedTime = "0h0m";
  if (history) {
    movie.history = history;
    watchedTime = formatRuntime(Math.ceil(history.lastSecond / 60));
  }

  const sources = await torrentService.searchMovie(movieId);

  movie.sources = sources;
  res.render("movie", { movie, watchedTime });
});

module.exports = router;