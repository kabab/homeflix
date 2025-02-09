const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();


router.post("/movies/:sourceId", async (req, res) => {
  const source = await prisma.source.findUnique({
    where: {
      id: parseInt(req.params.sourceId)
    }
  });
  let history
  console.log({
    sourceId: source.id,
    season: req.body.season,
    episode: req.body.episode,
    tvId: source.tvId,
  });
  if (source.episode) {
    history = await prisma.tvHistory.upsert({
      where: {
        sourceId_tvId_episode_season: {
          sourceId: source.id,
          season: source.season,
          episode: source.episode,
          tvId: source.tvId,
        }
      },
      create: {
        tvId: source.tvId,
        sourceId: source.id,
        lastSecond: req.body.lastSecond,
        duration: req.body.duration,
        season: source.season,
        episode: source.episode,
        type: "tv"
      },
      update: {
        lastSecond: req.body.lastSecond,
        sourceId: source.id
      }
    });
  } else {
    history = await prisma.movieHistory.upsert({
      where: {
        movieId: source.movieId,
      },
      create: {
        movieId: source.movieId,
        sourceId: source.id,
        lastSecond: req.body.lastSecond,
        duration: req.body.duration,
        type: "movie"
      },
      update: {
        lastSecond: req.body.lastSecond,
        sourceId: source.id
      }
    });
  }

  res.json(history);
});



module.exports = router;