const TorrentSearchApi = require('torrent-search-api');
const torrentStream = require('torrent-stream');
const prisma = require('../lib/prisma');
const { createHash } = require('crypto');

const findEpisodeFile = (files, episode) =>
  files.find((file) => file.name?.match(new RegExp(`(e|episode) ?0?${episode}`, "i")));

class StreamService {
  constructor() {
    this.files = {};
    this.engines = {};
  }

  static instance = null;

  /**
   * Get StreamService instance
   * @returns {StreamService}
   */
  static getInstance() {
    if (!StreamService.instance) {
      StreamService.instance = new StreamService();
    }

    return StreamService.instance
  }

  /**
   * Get list of files from torrent
   * @param {Torrent} torrent
   * @returns {Promise<TorrentFile[]>}
   * @throws {Error}
   */
  getTorrentFileList(torrent) {
    const torrentString = JSON.stringify(torrent);
    const torrentHash = createHash('sha256').update(torrentString).digest('hex');

    if (this.files[torrentHash]) {
      return Promise.resolve(this.files[torrentHash]);
    }

    return new Promise((resolve, reject) => {
      TorrentSearchApi.getMagnet(torrent).then((magnet) => {
        const engine = torrentStream(magnet);
        this.engines[torrentHash] = engine;
        engine.on('ready', () => {
          console.trace(engine.files.map((file) => file.name));
          console.info('Engine ready, number of files', engine.files.length);
          this.files[torrentHash] = engine.files;
          resolve(engine.files);
        });
      }).catch((error) => {
        console.error('Error', error);
        reject(error);
      });
    });
  }

  /**
   * Get list of files from torrent
   * @param {string} sourceId
   * @returns {Promise<TorrentFile[]>}
   * @throws {Error}
   */
  getFileList(sourceId) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (self.files[sourceId]) {
        resolve(self.files[sourceId]);
        return;
      }

      if (self.engines[sourceId]) {
        resolve(null);
        return;
      }
  
      prisma.source.findUniqueOrThrow({
        where: {
          id: sourceId
        }
      }).then((source) => TorrentSearchApi.getMagnet(source.torrent)
      ).then((magnet) => {
        console.info('Magnet created');
        console.debug(magnet);
        self.engines[sourceId] = torrentStream(magnet);
        self.engines[sourceId].on('ready', () => {
          console.trace(self.engines[sourceId].files.map((file) => file.name));
          console.info('Engine ready, number of files', self.engines[sourceId].files.length);
          self.files[sourceId] = self.engines[sourceId].files;
          resolve(self.engines[sourceId].files);
        });  
      }).catch((error) => {
        console.error('Error', error);
        reject(error);
      });
    });    
  }

  getMovieFile(sourceId) {
    if (!this.files[sourceId]) {
      throw new Error('Files not ready');
    }

    return this.files[sourceId].sort((a, b) => b.length - a.length)[0];
  }

  async getSourceFile(sourceId) {
    const source = await prisma.source.findUniqueOrThrow({
      where: {
        id: sourceId
      }
    });

    const files = await this.getTorrentFileList(source.torrent);
    if (source.episode) {
      return findEpisodeFile(files, source.episode);
    }

    return files.sort((a, b) => b.length - a.length)[0];
  }

  getEpisodeFile(sourceId, episode) {
    if (!this.files[sourceId]) {
      throw new Error('Files not ready');
    }

    return findEpisodeFile(this.files[sourceId], episode);
  }
}

module.exports = {StreamService, findEpisodeFile};