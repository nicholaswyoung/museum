var debug = require('debug')('Museum')
,   redis = require('redis')
,   q     = require('q')
,   url   = require('url')
,   Museum;

Museum = function () {};

Museum.prototype.configure = function (options) {
  options = options || {};

  this.namespace = options.namespace || 'museum';

  if (options.uri) {
    var params = url.parse(options.uri);
    this.store = redis.createClient(
      params.port,
      params.hostname
    );
    if (params.auth) this.store.auth(params.auth.split(':')[1]);
  } else {
    this.store = redis.createClient(
      options.port || 6379,
      options.host || 'localhost'
    );
    if (options.password) this.store.auth(options.password);
  }

  this.store.on('connect', function () {
    debug('Redis connected.');
  });

  this.store.on('ready', function () {
    debug('Redis ready.');
  });

  this.store.on('error', function (err) {
    debug('Redis: ' + err);
  });

  if (options.db) this.store.select(options.db);

  this.store.on('connect', function () {
    debug('Connected.');
  });

  debug('configured.');
};

Museum.prototype.setKey = function (key) {
  return [key, this.namespace].join(':');
};

Museum.prototype.get = function (key) {
  var deferred = q.defer();

  this.store.get(this.setKey(key), function (err, result) {
    if (err) return deferred.reject(err);
    try { result = JSON.parse(result); } catch (e) {}
    deferred.resolve(result);
    debug('Retrieving key %s.', key);
  });

  return deferred.promise;
};

Museum.prototype.set = function (key, ttl, input) {
  if ('string' !== typeof input) input = JSON.stringify(input);

  var deferred = q.defer();

  this.store.setex(this.setKey(key), ttl, input, function (err, result) {
    if (err) return deferred.reject(err);
    deferred.resolve(result);
    debug('Key %s has been stored.', key);
  });

  return deferred.promise;
};

Museum.prototype.del = function (key) {
  var deferred = q.defer();

  this.store.del(this.setKey(key), function (err, result) {
    if (err) return deferred.reject(err);
    deferred.resolve(result);
    debug('Key %s has been removed.', key);
  });

  return deferred.promise;
};

Museum.prototype.wrap = function (key, ttl, task) {
  var self     = this
  ,   deferred = q.defer();

  self.get(key)
    .then(function (result) {
      if (result) deferred.resolve(result);
    }, function (err) {
      if (err) deferred.reject(err);
    });

  task.call(self, function (err, data) {
    if (err) deferred.reject(err);

    self.set(key, ttl, data)
      .then(function () {
        deferred.resolve(data);
      }, function (err) {
        deferred.reject(err);
      });
  });

  return deferred.promise;
};

module.exports = new Museum();
