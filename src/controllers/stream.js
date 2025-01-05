const express = require('express');
const StreamService = require('../services/stream');
const rangeParser = require('range-parser');
const pump = require('pump');
const prisma = require('../lib/prisma');
const { listSubtitles, getSubtitle } = require('../services/subtitle');

var mime;
import("mime").then(m => {  
  mime = m.default;
});

const streamService = new StreamService();

const router = express.Router();

async function video(req, res) {
  const sourceId = parseInt(req.params.id);
  const source = await prisma.source.findUnique({
    where: {
      id: sourceId
    }
  });

  if (!source) {
    await prisma.movieHistory.deleteMany({
      where: {
        sourceId: sourceId
      }
    });

    res.status(404).send('Please try to search again');
    return
  }

  const history = await prisma.movieHistory.findFirst({
    where: {
      sourceId: source.id,
    }
  });

  res.render("video", {
    source,
    history,
    episode: req.params.episode,
    season: req.params.season,
  });
};

router.get('/:id', video)
router.get('/:id/s/:season/e/:episode', video)

router.get('/:id/subtitles', async (req, res) => {
  const sourceId = parseInt(req.params.id);
  const file = await streamService.getFile(sourceId);
  if (!file) {
    res.status(404).send('Please try to search again');
    return
  }

  const subs = await listSubtitles(file.name);
  res.json(subs);
});

router.get('/:id/subtitles/:fileId', async (req, res) => {
  const sub = await getSubtitle(req.params.fileId);
  res.json(sub);
});

function stream(req, res, file) {
  var range = req.headers.range
  range = range && rangeParser(file.length, range)[0]
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Type', mime.getType(file.name))
  res.setHeader('transferMode.dlna.org', 'Streaming')
  res.setHeader('contentFeatures.dlna.org', 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000')
  if (!range) {
    res.setHeader('Content-Length', file.length)
    if (req.method === 'HEAD') return res.end()
    pump(file.createReadStream(), res)
    return
  }

  res.statusCode = 206
  res.setHeader('Content-Length', range.end - range.start + 1)
  res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length)
  if (req.method === 'HEAD') return res.end()
  pump(file.createReadStream(range), res)
}


router.use('/:id/video/s/:season/e/:episode', async (req, res) => {
  await streamService.getFileList(parseInt(req.params.id));

  const source = await prisma.source.findUnique({
    where: {
      id: parseInt(req.params.id)
    }
  });

  const file = await streamService.getEpisodeFile(source.id, req.params.episode);

  console.debug("Espiode file name:", file.name);
  if (!file) {
    res.status(404).send('Please try to search again');
    return
  }
  
  stream(req, res, file);
});

router.use('/:id/video', async (req, res) => {
  await streamService.getFileList(parseInt(req.params.id));

  const source = await prisma.source.findUnique({
    where: {
      id: parseInt(req.params.id)
    }
  });

  const file = await streamService.getMovieFile(source.id);

  console.debug("Movie file name:", file.name);
  if (!file) {
    res.status(404).send('Please try to search again');
    return
  }
  
  stream(req, res, file);
});

module.exports = router;