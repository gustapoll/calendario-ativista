const constants = require('./constants');


const _ = require('lodash');
const fp = require('lodash/fp');

const __ = undefined;

const { Storage } = require('@google-cloud/storage');

const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || './auth/google-credentials.json'

var gcs = new Storage({
  projectId: 'calendario-ativista',
  keyFilename: GOOGLE_APPLICATION_CREDENTIALS
});

var bucket = gcs.bucket('calendario-ativista.appspot.com');


onRequest = {}

onRequest.hashtags = (request, response) => {
  response.send({"hashtags": constants.HASHTAG_LABELS, "tags": constants.TAGS});
}

onRequest.image = (req, res) => {

  const paramsSchema = [
    { name: 'hashtag', format: `(${constants.HASHTAG_LABELS.join('|')})` },
    { name: 'date',    format:  '[\\d]{4}[\\-](0[1-9]|1[0-2])[\\-](0[1-9]|[12][0-9]|3[01])' },
    { name: 'label',   format: `(${constants.LABELS.join('|')})` },
    { name: 'name',    format: '\\w+\\.(png|jpg)' },
  ]

  const pParse = (req) => fp.map(param => _.set(param, 'value', req.query[param.name]));

  const params = pParse(req)(paramsSchema)

  const pParamFormat = fp.pipe(
    fp.map(param          => param.value ?? param.format),
    fp.reduce((acc, elem) => acc ? `${acc}/${elem}` : elem, __),
    rgx                   => new RegExp(`^${rgx}$`)
  );

  const format = pParamFormat(params);

  /** request flow control pipelines */

  const pOnError = fp.pipe(
    err => (console.log(err), err),
    ()  => ({files: [], error: true}),
    obj => res.send(obj)
  );

  const pOnSuccess = fp.pipe(
    fp.map(file    => file.name),
    fp.filter(name => format.exec(name)),
    names          => (console.log(names), names),
    names          => ({files: names, error: false}),
    obj            => res.send(obj)
  );

  /** main pipeline */

  const validation = { get isValid () { return this?.value ? this.format_rgx.exec(this.value) : __ } };

  fp.pipe(
    fp.map(param          =>  _.set(param, 'isValid', validation)),
    fp.map(param          =>  param.isValid ? param.value : __),      // [str] -> [str]: replace invalid params by none
    fp.reduce((acc, elem) =>  !acc ? [elem]                           // [str] -> [str]: drop after first undefined param
                            : acc[acc.length - 1] ? acc.concat(elem) 
                            : acc, __),
    arr                   =>  arr[arr.length - 1] ? arr               // [str] -> [str]: drop last elem if undefined
                            : arr.slice(0, -1),
    fp.reduce((acc, elem) =>  acc ? `${acc}/${elem}` : elem, __),     // [str] ->  str : build object path in storage
    obj                   =>  /\w+\.(png|jpg)$/.exec(obj) ? obj       //  str  ->  str : identity if file
                            : /\/[\w_-]+$/.exec(obj) ? `${obj}/`      //               : add `/` if folder
                            : __,                                     //               : otherwise undefined
    obj                   =>  ({autoPaginate: false, prefix: obj}),   //  str  -> dict : set storage query
    query                 =>  (console.log(query), query),            // *logging*
    query                 =>  bucket.getFiles(query,                  // *request*
      (err, files)        =>  err ? pOnError(err)
                            : pOnSuccess(files)
    )
  )(params)
}


module.exports = onRequest
