var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');

/* GET home page. */
module.exports = (db) => {

  router.get('/', function (req, res, next) {
    res.render('login', { loginInfo: req.flash('loginInfo') })
  });

  router.post('/login', function (req, res, next) {
    const { email, password } = req.body
    db.query('SELECT * FROM users WHERE email= $1', [email], (err, data) => {
      if (err) {
        req.flash('loginInfo', 'Ooops... Something Wrong, please call administrator!');
        return res.redirect('/');
      };

      if (data.rows.length == 0) {
        req.flash('logininfo', 'Wrong email or password');
        return res.redirect('/');
      };

      bcrypt.compare(password, data.rows[0].password, function (err, isValid) {
        console.log(isValid)
        if (err) {
          req.flash('loginInfo', 'Ooops... Something Wrong, please call administrator!');
          return res.redirect('/');

        };

        if (!isValid) {
          req.flash('loginInfo', 'Wrong email or password');
          return res.redirect('/');
        }

        req.session.user = data.rows[0]
        res.redirect('/projects');

      });

    });
  });

  router.get('/logout', function (req, res, next) {
    req.session.destroy(function (err) {
      if (err) return res.send(err)
      res.redirect('/')
    })

  });

  return router;
}
