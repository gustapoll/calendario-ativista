var fs = require('fs');

var glob = require("glob");

var moment = require('moment')
var momentRange = require('moment-range')

moment = momentRange.extendMoment(moment)

var _ = require('lodash');
var fp = require('lodash/fp');

var __ = undefined;


var { Storage } = require('@google-cloud/storage');

var GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || './auth/google-credentials.json'

var gcs = new Storage({
  projectId: 'calendario-ativista',
  keyFilename: GOOGLE_APPLICATION_CREDENTIALS
});


var admin = require('firebase-admin');

var { HASHTAG_LABELS, LABELS, TAGS } = require('./constants');

admin.initializeApp({
  credential: admin.credential.cert(GOOGLE_APPLICATION_CREDENTIALS)
});

var db = admin.firestore();


var freeze = obj => _.cloneDeep(obj)

/** re-used functions */
var paramsSchema = [
  { name: 'year',  format: '([\\d]{4})' },
  { name: 'month', format: '(0[1-9]|1[0-2])' },
  { name: 'day',   format: '(0[1-9]|[12][0-9]|3[01])' },
  { name: 'hashtag', format: `(${HASHTAG_LABELS.join('|')})` },
  { name: 'label', format: `(${LABELS.join('|')})` },
  { name: 'name',  format: '([\\w_-]+\\.(?:png|jpg))' },
]

var pParamFormat = fp.pipe(
  fp.map(param          => param.value ?? param.format),
  fp.reduce((acc, elem) => acc ? `${acc}/${elem}` : elem, __),
  rgx                   => new RegExp(`${rgx}`)
);

/*******/

onRequest = {}

onRequest.hashtags = (request, response) => {
  response.send({"hashtags": HASHTAG_LABELS, "tags": TAGS});
}

// req = {query: {currentMonth: '2020-05'}}

function getContentById(ids, path) {
  return new Promise((res) => {
    // don't run if there aren't any ids or a path for the collection
    if (!ids || !ids.length || !path) return res([]);

    const collectionPath = db.collection(path);
    let batches = [];

    while (ids.length) {
      // firestore limits batches to 10
      const batch = ids.splice(0, 10);

      // add the batch request to to a queue
      batches.push(
        new Promise(response => {
          collectionPath
            .where(
              '__name__',
              'in',
              [...batch]
            )
            .get()
            .then(results => response(results.docs.map(result => ({ id: result.id, ...result.data()}) )))
        })
      )
    }

    // after all of the data is fetched, return it
    Promise.all(batches).then(content => {
      res(content.flat());
    })

  })
}

onRequest.tweet = async (req, res) => {
  params = { currentMonth:  req.query['currentMonth'] }

  inputFormat = /(?:\d{4})-(?:0[1-9]|1[0-2])/

  month = fp.pipe(
    input => inputFormat.exec(input) ? input : __,
    month => moment(month, 'YYYY-MM')
  )(params.currentMonth)

  range = moment().range(moment(month).startOf('month'), moment(month).endOf('month'));

  daysInMonth = [...range.by('days')].map(date => date.format('YYYY-MM-DD'))

  tweets = await getContentById(daysInMonth, "tweets")

  formatRes = fp.pipe(
    fp.groupBy(dict        => dict.id),
    dict                   => Object.entries(dict),
    fp.reduce((acc, [k,v]) => _.set(acc, k, v[0]?.top_tweets ?? []), {}),
  )

  res.send(formatRes(tweets))
}

onRequest.image = async (req, res) => {
  pParse = (req) => fp.map(param => _.set(param, 'value', req.query[param.name]));

  params = pParse(req)(paramsSchema)

  format = pParamFormat(params);

  postRef = db.collection("posts")

  validation = { get isValid () { return this.value ? this.format.exec(this.value) : __ } };

  requestPosts = await fp.pipe(
    fp.map(param          =>  _.set(param, 'isValid', validation)),
    fp.map(param          =>  param.isValid ? param : __),
    fp.filter(param       => param.value),
    fp.reduce((acc, elem) => acc.where(elem.name, "==", elem.value), postRef),
    query                 => query.get()
  )(params)

  posts = []
  requestPosts.forEach(doc => posts.push(doc.data()));

  aggByKeys = fp.reduce((agg, key) => 
    fp.pipe(
      fp.groupBy(dict        => dict[key]),
      dict                   => Object.entries(dict),
      fp.reduce((acc, [k,v]) => _.set(freeze(acc), k, agg(v)), {})
    )
  , x => x[0])

  aggRes = aggByKeys(['label', 'hashtag', 'date'])

  allTags = fp.pipe(
    fp.groupBy(dict        => dict.date),
    dict                   => Object.entries(dict),
    fp.reduce((acc, [k,v]) => _.set(acc, k, [...new Set(v.flatMap(x => x.tags))]), {}),
  )

  formatRes = fp.pipe(
    fp.groupBy(x => x.date),
    x            => Object.keys(x),
    fp.reduce((acc, date) => {

      var { top_3, ...images } = aggRes(posts)[date];

      return _.set(acc, date, ({
        'used_tags': allTags(posts)[date], 
        'images': images,
        'top_3': top_3
      }))
    }, {})
  )

  res.send(formatRes(posts))
}

module.exports = onRequest
