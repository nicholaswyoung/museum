var museum = require('../')
,   redis  = require('redis')
,   q      = require('q')
,   expect = require('chai').expect;

describe('Museum', function () {
  it('should support the configure() method', function () {
    expect(museum.configure).to.not.equal(undefined);
    expect(typeof museum.configure).to.equal('function');
  });

  it('should support the set() method', function () {
    expect(museum.set).to.not.equal(undefined);
    expect(typeof museum.configure).to.equal('function');
  });

  it('should support the get() method', function () {
    expect(museum.get).to.not.equal(undefined);
    expect(typeof museum.configure).to.equal('function');
  });

  it('should support the del() method', function () {
    expect(museum.del).to.not.equal(undefined);
    expect(typeof museum.del).to.equal('function');
  });

  it('should support the wrap() method', function () {
    expect(museum.wrap).to.not.equal(undefined);
    expect(typeof museum.wrap).to.equal('function');
  });
});

describe('museum.configure()', function () {
  before(function () {
    museum.configure();
  });

  it('should setup the Redis client', function () {
    expect(museum.store).to.not.equal(undefined);
    expect(museum.store instanceof redis.RedisClient).to.equal(true);
  });

  it('should use a default namespace of "museum"', function () {
    expect(museum.namespace).to.equal('museum');
  });
});

describe('museum.configure() detailed', function () {
  before(function () {
    museum.configure({
      namespace: 'archaeology'
    });
  });

  it('should allow overriding of the default namespace', function () {
    expect(museum.namespace).to.equal('archaeology');
  });
});

describe('museum.set() / museum.get()', function () {
  describe('should store a key for future retrieval', function () {
    it('as a string', function (done) {
      q.all([
        museum.set('message', 1, 'hello'),
        museum.get('message')
      ]).then(function (results) {
        expect(results[1]).to.equal('hello');
        done();
      }, function (err) {
        if (err) return done(err);
      });
    });

    it('as json', function (done) {
      q.all([
        museum.set('user', 1, { user: 'Nicholas' }),
        museum.get('user')
      ]).then(function (results) {
        expect(results[1]).to.have.property('user');
        expect(results[1].user).to.equal('Nicholas');
        done();
      }, function (err) {
        if (err) return done(err);
      });
    });
  });

  it('should expire the key when supplied time has past', function (done) {
    museum.set('timeout', 1, 'this message will self destruct.')
      .then(function () {
        setTimeout(function () {
          museum.get('timeout')
            .then(function (reply) {
              expect(reply).to.equal(null);
              done();
            }, function (err) {
              if (err) return done(err);
            });
        }, 1050);
      }, function (err) {
        if (err) return done(err);
      });
  });
});

describe('museum.wrap()', function () {
  it('should cache the results from the wrapped function', function (done) {
    museum.wrap('wrapped', 3, function (done) {
      setTimeout(function () {
        done(null, 'hello');
      }, 1);
    }).then(function (result) {
      expect(result).to.equal('hello');
      done();
    }, function (err) {
      if (err) return done(err);
    });
  });
});
