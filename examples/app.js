var app    = require('express')()
,   museum = require('../')
,   slow;

museum.configure();

/**
 * Example of a slow function
 * (maybe a real-world database call), etc.
 */
slow = function (done) {
  setTimeout(function () {
    done(null, { name: 'Nicholas Young' });
  }, 1000);
};

app.route('/slow')
  .get(function (req, res, next) {
    slow(function (err, user) {
      req.user = user;
      next();
    });
  })
  .get(function (req, res) {
    res.json(req.user);
  });

app.route('/fast')
  .get(function (req, res, next) {
    museum.wrap('user', 10, slow)
      .then(function (result) {
        req.user = result;
        next();
      }, function (err) {
        // No errors here.
        if (err) return next(err);
      });
  })
  .get(function (req, res) {
    res.json(req.user);
  });

app.listen(3000);
