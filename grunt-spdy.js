var _ = require('underscore');
var spdy = require('spdy');
var express = require('express');
var fs = require('fs');
var filed = require('filed');
var mime = require('mime');

var timestamps = {
  '/': new Date('Tue, 18 Mar 2014 13:37:00 GMT'),
  '/picture.jpg': new Date('Tue, 18 Mar 2013 13:37:00 GMT'),
  '/behaviour.js': new Date('Tue, 18 Mar 2014 13:37:00 GMT'),
  '/design.css': new Date('Tue, 18 Mar 2015 13:37:00 GMT')
};

var dependencies = {
  '/': [
    '/design.css',
    '/behaviour.js',
    '/picture.jpg'
  ]
};

var spdyPushIfModifiedSince = function (req, res, next) {
  if (timestamps.hasOwnProperty(req.path)) {
    res.set('last-modified', timestamps[req.path].toUTCString());
    res.set('expires', new Date(0).toUTCString());
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  _(dependencies[req.path]).chain()
  .reject(function (dependency) {
    var since = new Date(req.headers['if-modified-since']);
    console.log(since, timestamps[dependency]);
    return since > timestamps[dependency];
  })
  .each(function (dependency) {
    console.log(req.path, ' needs ', dependency);
    var stream = res.push(dependency, {
      'content-type': mime.lookup(dependency),
      'last-modified': timestamps[dependency].toUTCString()
    });
    stream.on('error', function() {});
    var file = filed(__dirname + '/www' + dependency);
    file.pipe(stream);
  });

  setTimeout(function () {
    next();
  }, 2000);
};

var app = express()
  .use(spdyPushIfModifiedSince)
  .use(express.static(__dirname + '/www'));

var options = {
  key: fs.readFileSync(__dirname + '/keys/server-key.pem'),
  cert: fs.readFileSync(__dirname + '/keys/server-cert.pem'),
  // ca: fs.readFileSync(__dirname + '/keys/server-ca.pem'),
  // plain: true,
  // ssl: false
};

var server = spdy.createServer(options, app);
server.listen(process.env.PORT || 443);
console.log('Listening on port %d', process.env.PORT || 443);
