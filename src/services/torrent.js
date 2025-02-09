const TorrentSearchApi = require('torrent-search-api');
const NodeCache = require('node-cache');
const prisma = require('../lib/prisma');
const fastLevenshtein = require("fast-levenshtein")
const tmdbAdapter = require('../adapters/tmdb');
const { createHash } = require('crypto');
const _ = require('lodash');

TorrentSearchApi.enableProvider("Yts");
TorrentSearchApi.enableProvider("ThePirateBay");
TorrentSearchApi.enableProvider("1337x");

const cache = new NodeCache({
  stdTTL: 0,
  checkperiod: 0,
});

async function getTorrents(query, type) {
  const key = `torrents:${query}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  let torrents = await TorrentSearchApi.search(query, type, 20);
  cache.set(key, torrents);
  return torrents;
}

module.exports.searchMovie = async (movieId) => {
  const movie = await tmdbAdapter.getMovie(movieId);

  const sources = await prisma.source.findMany({
    where: {
      movieId: parseInt(movieId)
    }
  });
  
  if (!sources.length) {
    const query = `${movie.title} ${movie.release_date.split('-')[0]}`;
    let torrentSearch = await getTorrents(query, 'Movies');
    torrentSearch = torrentSearch.map(torrent => {
      const distance = fastLevenshtein.get(torrent.title, movie.title);
      return {
        ...torrent,
        distance: distance,
      }
    });

    torrentSearch = _.sortBy(torrentSearch, ['distance']);

    await prisma.source.createMany({
      data: torrentSearch.map(result => ({
        movieId: parseInt(movieId),
        torrent: result,
      })),
    })

    return prisma.source.findMany({
      where: {
        movieId: parseInt(movieId)
      }
    });
  }

  return sources;
}

module.exports.searchTvShow = async (name, season, episode) => {
  const formattedSeason = String(season).padStart(2, '0');
  const formattedEpisode = String(episode).padStart(2, '0');
  let searchQuery = `${name} S${formattedSeason}`;
  const torrentSearch = await TorrentSearchApi.search(searchQuery, 'TV', 20);
  searchQuery = `${name} S${formattedSeason}E${formattedEpisode}`;
  const sources = torrentSearch.map(torrent => {
    const distance = fastLevenshtein.get(searchQuery, name);
    return {
      ...torrent,
      distance,
      base64: Buffer.from(JSON.stringify(torrent)).toString('base64'),
    }
  });
  
  return _.sortBy(sources, ['distance']);
}