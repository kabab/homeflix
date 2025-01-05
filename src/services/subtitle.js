const OS = require('opensubtitles.com');
const subtitle = require('subtitle');

let os = null;

(async function getOSClient() {
  if (os) {
    return os;
  }

  try {
      os = new OS({
        apikey: process.env.OPENSUBTITLES_API_KEY,
        useragent: "homeflix v0.1"
      });

      os.login({
        username: process.env.OPENSUBTITLES_USERNAME,
        password: process.env.OPENSUBTITLES_PASSWORD,
      });
      return os;
  } catch (error) {

    console.error(error);
  }
})()

module.exports.listSubtitles = async function listSubtitles(filename) {
  if(os) {
    const subs = await os.subtitles({
      query: filename,
      languages: "en",
    });

    return subs;
  }

  return [];
}

module.exports.getSubtitle = async function getSubtitle(fileId) {
  if (os) {
    const subfile = await os.download({
      file_id: fileId,
    });
    
    const subfileTxt = await fetch(subfile.link);
    const parsedSub = subtitle.parseSync(await subfileTxt.text())
    return parsedSub;
  }
  return [];
}