var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
const bcrypt = require('bcrypt')
const saltRounds = 10

/* GET home page. */
module.exports = (db) => {

    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        let link = 'profile'
        let user = req.session.user
        let sql = `SELECT * FROM users WHERE email = $1`
        db.query(sql, [user.email], (err, data) => {
            if (err) {
                return res.send(err)
            } else {
                res.render('profile/profile', {
                    link,
                    user,
                    data: data.rows[0],
                    user: req.session.user
                })
            }
        })
    })

    router.post('/', helpers.isLoggedIn, (req, res) => {
        let user = req.session.user
        const { password, position, contract } = req.body

        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) return res.send(err)
            let sql = `UPDATE users SET password = '${hash}', position = '${position}', contract = '${contract}' WHERE email = '${user.email}'`
            console.log('pos', position);
            console.log('con', contract);
            db.query(sql, (err) => {
                if (err) return res.send(err)
            })
            res.redirect('/projects')
        })
    })

    return router;
}
