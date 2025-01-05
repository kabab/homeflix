const axios = require('axios');
const NodeCache = require('node-cache');
const fastLevenshtein = require("fast-levenshtein")

const cache = new NodeCache({
  stdTTL: 0,
  checkperiod: 0,
});

const tmdb = axios.create({
  baseURL: process.env.TMBD_BASE_URL,
  params: {
    api_key: process.env.TMBD_API_KEY,
  },
});

// get 5 pages and sort them
async function search(query, type = 'movie') {
  const key = `tmdb:search:${type}:${query}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const pages = await Promise.all([...Array(5).keys()].map(async (page) => {
    const resp = await tmdb.get(`/search/${type}`, {
      params: {
        query,
        page: page + 1,
      },
    });

    return resp.data.results;
  }));

  const movies = pages.flat().map(movie => {
    const distance = fastLevenshtein.get(type === 'movie' ? movie.title : movie.name, query);
    return {
      ...movie,
      distance,
    };
  });

  movies.sort((a, b) => {
    return a.distance - b.distance;
  });

  cache.set(key, movies);
  return movies;
}

module.exports.search = async function (query) {
  const movies = await search(query);
  return movies;
}

module.exports.getMovie = async function getMovie(movieId) {
  const key = `tmdb:getMovie:${movieId}`;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const res = await tmdb.get(`/movie/${movieId}`);
  cache.set(key, res.data);
  return res.data;
}

module.exports.searchTv = async function searchTv(query) {
  const movies = await search(query, 'tv');
  return movies;
}

module.exports.getTv = async function getTv(tvId) {
  const key = `tmdb:getTv:${tvId}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const res = await tmdb.get(`/tv/${tvId}`);
  cache.set(key, res.data);

  return res.data;
}

module.exports.getSeason = async function getSeason(tvId, season) {
  const key = `tmdb:getSeason:${tvId}:${season}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const res = await tmdb.get(`/tv/${tvId}/season/${season}`);
  cache.set(key, res.data);
  return res.data;
}
