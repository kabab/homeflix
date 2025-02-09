const express = require("express");
const _ = require('lodash');
const prisma = require("../lib/prisma");
const { TvShow } = require("../services/tvShow");
const {StreamService, findEpisodeFile} = require("../services/stream");

const router = express.Router();

const streamService = StreamService.getInstance();

router.get("/:tvId/s/:season", async (req, res) => {
  const tvShow = await TvShow.getInstance(req.params.tvId);
  const episodes = await tvShow.getSeasonEpisodes(req.params.season);
  return res.json(episodes);
});

router.get("/:tvId", async (req, res) => {
  const tvShow = await TvShow.getInstance(req.params.tvId);
  res.render("tv", { tv: tvShow });
});

router.get("/:tvId/s/:season/e/:episode", async (req, res) => {
  const tvId = req.params.tvId;

  const tvShow = await TvShow.getInstance(tvId);
  const episode = await tvShow.getEpisode(req.params.season, req.params.episode);

  const source = await episode.getSource();
  if (source) {
    return res.redirect(`/stream/${source.id}`);
  }

  const sources = await episode.getSources();

  res.render('sources', {
    tv: tvShow,
    sources,
    episode,
  });
});

router.get("/:tvId/s/:season/e/:episode/:source", async (req, res) => {
  const season = req.params.season;
  const sourceBase64 = req.params.source;
  const source = JSON.parse(Buffer.from(sourceBase64, 'base64').toString('ascii'));
  const tvShow = await TvShow.getInstance(req.params.tvId);
  const episode = await tvShow.getEpisode(season, req.params.episode);

  let s = await episode.getSource();
  if (s) {
    return res.redirect(`/stream/${s.id}`);
  }

  const episodes = await tvShow.getSeasonEpisodes(season);
  const files = await streamService.getTorrentFileList(source);
  await Promise.all(
    episodes.map((episode) => {
      const episodeFile = findEpisodeFile(files, episode.episode);
      if (episodeFile) {
        return prisma.source.create({
          data: {
            tvId: parseInt(req.params.tvId),
            torrent: source,
            season: parseInt(season),
            episode: parseInt(episode.episode),
            filename: episodeFile.name,
          }
        });
      }
    })
  );

  s = await episode.getSource();
  res.redirect(`/stream/${s.id}`);
});

// router.get("/:")

module.exports = router;