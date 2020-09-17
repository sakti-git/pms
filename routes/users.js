var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
const bcrypt = require('bcrypt');
const saltRounds = 10;

let checkOpt = {
  id: true,
  name: true,
  email: true,
  position: true,
  type: true,
  role: true
}

module.exports = (db) => {
  /* GET users listing. */
  router.get('/', helpers.isLoggedIn, (req, res) => {
    let link = 'users'
    let result = [];
    let search = ""

    if (req.query.checkId && req.query.id) {
      result.push(`userid = ${parseInt(req.query.id)}`)
    }

    if (req.query.checkName && req.query.name) {
      result.push(`CONCAT(firstname, ' ', lastname) ILIKE '%${req.query.name}%'`)
    }

    if (req.query.checkEmail && req.query.email) {
      result.push(`email = '${req.query.email}'`)
    }

    if (req.query.checkPosition && req.query.position) {
      result.push(`position = '${req.query.position}'`)
    }

    if (req.query.checkType && req.query.type) {
      result.push(`contract = '${req.query.type}'`)
    }

    if (result.length > 0) {
      search += ` WHERE ${result.join(' AND ')}`
    }

    let sqlUser = `SELECT COUNT (userid) AS total FROM users ${search}`

    db.query(sqlUser, (err, dataUser) => {
      if (err) return res.send(err)

      let total = dataUser.rows[0].total
      const url = req.url == '/' ? '/?page=1' : req.url;
      const page = req.query.page || 1;
      const limit = 3;
      const offset = (page - 1) * limit;
      let pages = Math.ceil(total / limit)
      let queryUser = `SELECT userid, email, CONCAT(firstname, ' ', lastname) AS fullname, position, contract, role
      FROM users ${search} ORDER BY userid ASC LIMIT ${limit} OFFSET ${offset}`

      db.query(queryUser, (err, dataQuery) => {
        if (err) return res.send(err)

        res.render('users/view', {
          link,
          pages,
          page,
          url,
          users: dataQuery.rows,
          option: checkOpt,
          user: req.session.user
        })
      })
    })
  });

  router.post('/', helpers.isLoggedIn, (req, res) => {
    checkOpt.id = req.body.checkColId
    checkOpt.name = req.body.checkColName
    checkOpt.email = req.body.checkColEmail
    checkOpt.position = req.body.checkColPosition
    checkOpt.type = req.body.checkColType
    checkOpt.role = req.body.checkColRole

    res.redirect('/users')
  })

  router.get('/add', helpers.isLoggedIn, (req, res) => {
    const link = 'users';
    res.render('users/add', {
      link,
      user: req.session.user
    })
  })

  router.post('/add', helpers.isLoggedIn, (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) return res.send(err)

      let data = `INSERT INTO users(firstname, lastname, email, password, position, contract, role) VALUES ($1, $2, $3, $4, $5, $6, $7)`
      let values = [req.body.firstName, req.body.lastName, req.body.email, hash, req.body.position, req.body.type, req.body.role]
      db.query(data, values, (err) => {
        if (err) return res.send(err)

        res.redirect('/users')
      })
    })
  })

  router.get('/edit/:id', helpers.isLoggedIn, (req, res) => {
    let link = 'users';
    let id = req.params.id;
    let data = `SELECT * FROM users WHERE userid = ${id}`

    db.query(data, (err, sql) => {
      if (err) return res.send(err)

      res.render('users/edit', {
        link,
        dataUser: sql.rows[0],
        user: req.session.user
      })
    })

  })

  router.post('/edit/:id', helpers.isLoggedIn, (req, res) => {
    let id = req.params.id;
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) return res.send(err)

      let sqlUpdate = `UPDATE users SET firstname=$1, lastname=$2, password=$3, position=$4, contract=$5, role=$6 WHERE userid=$7`
      let values = [req.body.firstName, req.body.lastName, hash, req.body.position, req.body.type, req.body.role, id]

      db.query(sqlUpdate, values, (err) => {
        if (err) return res.send(err)

        res.redirect('/users')
      })
    })
  })

  router.get('/delete/:id', helpers.isLoggedIn, (req, res) => {
    let id = req.params.id;
    let deleteData = `DELETE FROM users WHERE userid=$1`

    db.query(deleteData, [id], (err) => {
      if (err) return res.send(err)

      res.redirect('/users')
    })
  })

  return router;
}