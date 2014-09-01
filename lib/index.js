var debug = require('debug')('Museum')
,   redis = require('redis')
,   q     = require('q')
,   url   = require('url')
,   Museum;

Museum = function () {};

Museum.prototype.configure = function (options) {
  options = options || {};

  var host, port, auth;

  if (options.uri) options.uri = url.parse(options.uri);

  if (options.uri && options.uri.hostname) {
    host = options.uri.hostname;
  } else {
    host = options.host;
  }

  if (options.uri && options.uri.port) {
    port = options.uri.port;
  } else {
    port = options.port;
  }

  if (options.uri && options.uri.auth) {
    auth = options.uri.auth.split(':')[1];
  } else {
    auth = options.auth;
  }

  this.store = redis.createClient(
    port || 6379,
    host || 'localhost'
  );

  if (auth) this.store.auth(auth);
  if (options.db) this.store.select(options.db);

  this.store.on('connect', function () {
    debug('Redis connected.');
  });

  this.store.on('ready', function () {
    debug('Redis ready.');
  });

  this.store.on('error', function (err) {
    debug('Redis: ' + err);
  });

  this.store.on('connect', function () {
    debug('Connected.');
  });

  this.namespace = options.namespace || 'museum';
  this.enabled   = options.enabled || true;

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

  this.store.psetex(this.setKey(key), ttl, input, function (err, result) {
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

  if (self.enabled) {
    self.get(key)
      .then(function (result) {
        if (result) deferred.resolve(result);
      }, function (err) {
        if (err) deferred.reject(err);
      });
  }

  task.call(self, function (err, data) {
    if (err) deferred.reject(err);
    if (data && !self.enabled) deferred.resolve(data);
    
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
