const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();


router.post("/movies/:sourceId", async (req, res) => {
  const source = await prisma.source.findUnique({
    where: {
      id: parseInt(req.params.sourceId)
    }
  });


  const history = await prisma.movieHistory.upsert({
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

  res.json(history);
});

module.exports = router;