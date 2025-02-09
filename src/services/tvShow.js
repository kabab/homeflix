const prisma = require("../lib/prisma");
const tmdbAdapter = require("../adapters/tmdb");
const { searchTvShow } = require("./torrent");
class TvShow {
  /**
   * Search for TV Show in TMDB
   * Show top 10 results and only those with a poster
   * @param {string} q Search query
   * @returns {Promise<Array<TvShow>>}
   */
  static async search(q) {
    const movies = await tmdbAdapter.search(q);
    const filtredMovies = movies.filter(movie => movie.poster_path).slice(0, 10);
    return filtredMovies;
  }


  constructor({ id, name, poster_path, overview, first_air_date, number_of_seasons, historyList }) {
    this.id = id;
    this.name = name;
    this.poster_path = poster_path;
    this.overview = overview;
    this.first_air_date = first_air_date
    this.number_of_seasons = number_of_seasons;
    this.historyList = historyList;
  }

  /**
   * Get TV Show instance
   * @param {string} tvShowId TV Show id in TMDB
   */
  static async getInstance(tvShowId) {
    const tv = await tmdbAdapter.getTv(tvShowId);
    const history = await prisma.tvHistory.findMany({
      where: {
        tvId: parseInt(tvShowId),
      },
      orderBy: [
        {
          season: 'desc',
        },
        {
          episode: 'desc',
        }
      ]
    });

    return new TvShow({...tv, historyList: history});
  }

  /**
   * Get the episode to continue watching or the next episode
   * If there's no history, return nothing (null)
   * @returns {Promise<Episode> | null}
   */
  async getEpisodeToWatch() {

    if (!this.historyList.length) {
      return null;
    }

    const lastHisotry = this.historyList[0];
    const lastEpisode = await this.getEpisode(lastHisotry.season, lastHisotry.episode);
    if (lastEpisode.isWatched()) {
      return await lastEpisode.nextEpisode();
    }

    return lastEpisode;
  }

  async getEpisode(season, episode) {
    const seasonData = await tmdbAdapter.getSeason(this.id, season);
    const episodeHistory = this.historyList.find(h => h.season === season && h.episode === episode);
    const isSeasonFinal = episode === seasonData.episodes.length;
    const isFinal = season === this.number_of_seasons && isSeasonFinal;
    
    return new Episode({
      season,
      data: seasonData.episodes.find(e => e.episode_number === episode),
      episode,
      history: episodeHistory,
      isFinal,
      isSeasonFinal,
      tvShow: this
    });
  }

  async getFirstEpisode() {
    return this.getEpisode(1, 1);
  }

  async getSeasonEpisodes(season) {
    const seasonData = await tmdbAdapter.getSeason(this.id, season);
    return seasonData.episodes.map(episode => {
      const episodeHistory = this.historyList.find(h => h.season == season && h.episode == episode.episode_number);
      const isSeasonFinal = episode.episode_number === seasonData.episodes.length;
      const isFinal = season === this.number_of_seasons && isSeasonFinal;
      return new Episode({
        season,
        data: episode,
        episode: episode.episode_number,
        history: episodeHistory,
        isFinal,
        isSeasonFinal,
        tvShow: this 
      });
    });
  }

  async getDetails() {

  }
}

class Episode {

  static WATCHED_THRESHOLD_SECONDS = 30;

  constructor({ season, episode, history, isFinal, isSeasonFinal, tvShow, data }) {
    this.season = season;
    this.episode = episode;
    this.history = history;
    this.isFinal = isFinal;
    this.isSeasonFinal = isSeasonFinal
    // Parent TV Show
    this.tvShow = tvShow;
    this.data = data;
    this.watched = Episode.isWatched(history);
  }

  async getSource() {
    return prisma.source.findFirst({
      where:{
        tvId: parseInt(this.tvShow.id),
        season: parseInt(this.season),
        episode: parseInt(this.episode)
      }
    })
  }

  async getSources() {
    const sources = await searchTvShow(this.tvShow.name, this.season, this.episode);
    return sources;
  }

  async hasHistory() {
    return Bolean(this.history);
  }

  async nextEpisode() {
    if (this.isFinal) {
      return null;
    }

    if (this.isSeasonFinal) {
      return this.tvShow.getEpisode(this.season + 1, 1);
    }

    return this.tvShow.getEpisode(this.season, this.episode + 1);
  }

  static isWatched(history) {
    if (!history) {
      return false;
    }

    return history.lastSecond >= history.duration - Episode.WATCHED_THRESHOLD_SECONDS
  }

  isWatched() {
    return Episode.isWatched(this.history);
  }

  isFinal() {
    return this.isFinal;
  }
}

module.exports = { TvShow, Episode };