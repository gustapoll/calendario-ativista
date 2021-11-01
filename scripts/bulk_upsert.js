bulkInsert = (path) => {

  var parseImage = (attributes, format) => fp.pipe(
    file    => file.replace(/([\d]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])/, "$1/$2/$3"),
    file    => (console.log(imageFormat.exec(file) ? __ : file), imageFormat.exec(file)),
    atts    => atts.map((k, i) => [imageAttributes[i] ?? 'id', k]),
    atts    => Object.fromEntries(atts),
    obj     => _.set(obj, 'image_path', obj.path)
  )

  var imageAttributes = fp.pipe(
    obj        => freeze(obj),
    fp.map(att => att.name),
    arr        => (arr.unshift('path'), arr),
  )(paramsSchema)

  var parse = (reader, schema) => fp.pipe(
    file  => _.set({content: reader(file)}, 'path', file.replace(/([\d]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])/, "$1/$2/$3")),
    file  => fp.map(([k,v]) => [k, v(file)], Object.entries(schema)),
    pairs => Object.fromEntries(pairs),
  )

  var imageFormat = pParamFormat(paramsSchema);

  // schema

  var metaSchema = {
    owner_username:      x => x.content.node?.owner?.username,
    likes:               x => x.content.node?.edge_media_preview_like?.count,
    comments:            x => x.content.node?.edge_media_to_comment?.count,
    display_url:         x => "",
    thumbnail_resources: x => [],
    is_video:            x => false,
    path:                x => x.path
  }

  var textSchema = {
    hashtags: x => fp.filter(tag => x.content.includes(tag), HASHTAG_LABELS),
    tags:     x => fp.filter(tag => x.content.includes(tag), TAGS),
    caption:  x => x.content,
    path:     x => x.path
  }

  var parseMeta = parse(require, metaSchema)
  var parseText = parse(x => fs.readFileSync(x, 'utf8'), textSchema)

  var indexFun = fp.pipe(
    obj  => obj.path,
    path => path.replace('./data/mock/', ''),
    path => /([\w_-]+)_BRT(?:_[0-9]+)?\.(?:png|jpg|json|txt)/.exec(path)[1]
  )

  var pProcessFiles = fp.pipe(
    path           => glob.sync(`${path}/**/*`),
    fp.map(file    => /\w+\.(?:png|jpg)$/.exec(file) ? parseImage(imageAttributes, imageFormat)(file)
                    : /\w+\.(?:json)$/.exec(file) ? parseMeta(file)
                    : /\w+\.(?:txt)$/.exec(file) ? parseText(file)
                    : (console.log(`error: ${file}`), __)),
    fp.filter(obj  => obj),
    fp.map(obj => _.set(obj, 'index', indexFun(obj))),
    x => _
      .chain(x)
      .groupBy('index')
      .map((value, key) => value.reduce((acc, elem) => {

        var images = acc.images ? acc.images
                  : acc.image_path ? [acc.image_path] : []

        var obj = _.set(acc, 'images', (images ?? []).concat(elem.image_path ? [elem.image_path] : []))

        return Object.assign(obj, elem)
      }))
      .value(),
    fp.map(x => _.set(x, 'date', `${x.year}-${x.month}-${x.day}`)),
    fp.map(x => _.set(x, 'path', x.image_path)),
    fp.map(x => _.set(x, 'hashtags', [...new Set(x.hashtags.concat([x.hashtag]))])),
  )

  var postsRef = db.collection('posts');

  fp.pipe(
    pProcessFiles,
    fp.map(obj => postsRef.doc().set(obj))
  )('./data/mock/best')

  var storage = fp.map(x => bucket.upload(
    `./data/mock/best/${x.replace(/([\d]{4})\/(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])/, "$1-$2-$3")}`, 
  {destination: x}, function(err, file) {
    if (!err) {
      console.log(err)
    } else {
      console.log(file.name)
    }
  }));

  fp.pipe(
    pProcessFiles,
    fp.map(obj => storage(obj.images))
  )('./data/mock/best')
}