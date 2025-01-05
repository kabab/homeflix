const express = require("express");
const tmdbAdapter = require("../adapters/tmdb");
const TorrentSearchApi = require('torrent-search-api');
const _ = require('lodash');
const fastLevenshtein = require("fast-levenshtein")
const prisma = require("../lib/prisma");

TorrentSearchApi.enableProvider("Yts");
TorrentSearchApi.enableProvider("ThePirateBay");
TorrentSearchApi.enableProvider("1337x");

const router = express.Router();

const formatRuntime = (runtime) => {
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return `${hours}h${minutes}m`;
};

// Check if torrent have multiple episodes or just one
function isOneEpisode(torrentName) {
  const regex = /(E ?(\d{1,2})|Episode ?(\d{1,2}))/i;
  return regex.test(torrentName);
}

async function getSeasonSources(tvShow, seasonNumber, episodeNumber) {
  const formattedSeasonNumber = String(seasonNumber).padStart(2, '0');
  const formattedEpisodeNumber = String(episodeNumber).padStart(2, '0');
  let searchQuery = `${tvShow.name} S${formattedSeasonNumber}`;
  const torrentSearch = await TorrentSearchApi.search(searchQuery, 'TV', 20);
  searchQuery = `${tvShow.name} S${formattedSeasonNumber}E${formattedEpisodeNumber}`;
  const sources = torrentSearch.map(torrent => {
    const distance = fastLevenshtein.get(searchQuery, tvShow.name);
    return {
      ...torrent,
      distance,
      base64: Buffer.from(JSON.stringify(torrent)).toString('base64'),
    }
  })

  return _.sortBy(sources, ['distance']);
}

router.get("/:tvId", async (req, res) => {
  const tvId = req.params.tvId;
  const tv = await tmdbAdapter.getTv(tvId);
  tv.runtime = formatRuntime(tv.runtime);
  const season = 1;

  const history = await prisma.tvHistory.findFirst({
    where: {
      tvId: parseInt(tvId),
    }
  });

  if (history) {
    tv.history = history;
    const watchedTime = formatRuntime(Math.ceil(history.lastMinute / 60));
    return res.render("tv", { tv, watchedTime });
  }

  const sources = await getSeasonSources(tv, season);
  tv.sources = sources;
  tv.season = await tmdbAdapter.getSeason(tvId, season);
  res.render("tv", { tv });
});

router.get("/:tvId/s/:season/e/:episode", async (req, res) => {
  const tvId = req.params.tvId;
  const tv = await tmdbAdapter.getTv(tvId);
  const season = req.params.season;
  const episode = req.params.episode;

  // Check if already a source with this episode
  const source = await prisma.source.findFirst({
    where: {
      tvId: parseInt(tvId),
      season: parseInt(season),
      episode: null,
    }
  });

  if (source) {
    return res.redirect(`/stream/${source.id}/s/${season}/e/${episode}`);
  }

  const sources = await getSeasonSources(tv, season, episode);

  res.render('sources', {
    tv,
    sources,
    season,
    episode,
  });
});

router.get("/:tvId/s/:season/e/:episode/:source", async (req, res) => {
  const season = req.params.season;
  const episode = req.params.episode;
  const sourceBase64 = req.params.source;
  const source = JSON.parse(Buffer.from(sourceBase64, 'base64').toString('ascii'));
  // isOneEpisode(source.title) ? console.log('One episode') : console.log('Multiple episodes');

  const createdSource = await prisma.source.create({
    data: {
      tvId: parseInt(req.params.tvId),
      torrent: source,
      season: parseInt(season),
      episode: isOneEpisode(source.title) ? parseInt(episode) : null,
    }
  });

  res.redirect(`/stream/${createdSource.id}/s/${season}/e/${episode}`);
});

// router.get("/:")

module.exports = router;