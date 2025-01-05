const TorrentSearchApi = require('torrent-search-api');
const torrentStream = require('torrent-stream');
const prisma = require('../lib/prisma');

findEpisodeFile = (files, episode) =>
  files.find((file) => file.name?.match(new RegExp(`(e|episode) ?0?${episode}`, "i")));

module.exports = class StreamService {
  constructor() {
    this.files = {};
    this.engines = {};
  }

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
        // const engine = torrentStream(magnet);
        self.engines[sourceId] = torrentStream(magnet);
        self.engines[sourceId].on('ready', () => {
          console.trace(self.engines[sourceId].files.map((file) => file.name));
          // const file = self.engines[sourceId].files.sort((a, b) => b.length - a.length)[0];
          console.info('Engine ready, number of files', self.engines[sourceId].files.length);
          // file.select();
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

  getEpisodeFile(sourceId, episode) {
    if (!this.files[sourceId]) {
      throw new Error('Files not ready');
    }

    return findEpisodeFile(this.files[sourceId], episode);
  }
}