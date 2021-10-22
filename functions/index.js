const functions = require("firebase-functions");

import Constants from './constants'


exports.hashtags = functions.https.onRequest((request, response) => {
  functions.logger.info("[function:hashtags]", {structuredData: true});

  response.send({'hashtags': Constants.HASHTAG_LABELS, 'tags': Constants.TAGS})
});
