const axios = require('axios');

const opensubtitles = axios.create({
  baseURL: 'https://api.opensubtitles.org/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Api-Key': process.env.OPENSUBTITLES_API_KEY,
    'User-Agent': 'Homeflix V1',
  },
});

module.exports.searchSubtitle = async (query) => {
  const response = await opensubtitles.get('/search', {
    params: {
      sublanguageid: 'eng',
      query,
    },
  });
  return response.data;
}
