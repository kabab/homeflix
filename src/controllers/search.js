const express = require("express");
const tmdbAdapter = require("../adapters/tmdb");
const prisma = require("../lib/prisma");
const { TvShow } = require("../services/tvShow");

const router = express.Router();

router.get("/", async (req, res) => {
  let history = await prisma.movieHistory.findMany({
    orderBy: {
      updatedAt: "desc"
    },
  });

  history = await Promise.all(history.map(async (item) => {
    const movie = await tmdbAdapter.getMovie(item.movieId);
    return {
      ...item,
      movie,
    };
  }));

  res.render("index", { history });
});

router.get("/api/search", async (req, res) => {
  const tvShows = await TvShow.search(req.query.q);
  res.json(tvShows);
});

router.get("/api/search/tv", async (req, res) => {
  const tvShows = await tmdbAdapter.searchTv(req.query.q);
  const filtredTvShows = tvShows.filter(tv => tv.poster_path).slice(0, 10);
  res.json(filtredTvShows);
});


router.get("/api/history", async (req, res) => {
  
  res.json(history);
});

module.exports = router;