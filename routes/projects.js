var express = require('express');
var router = express.Router();
var path = require('path');
var moment = require('moment');
var helpers = require('../helpers/util');


/* GET home page. */
module.exports = (db) => {

    // start main project
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        let link = 'projects'
        res.render('projects/view', {
            link, user: req.session.user
        });
    });

    router.get('/add', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/add', { user: req.session.user })
    });

    router.post('/add', helpers.isLoggedIn, function (req, res, next) {
        res.redirect('/projects')
    });

    router.get('/edit/:id', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/edit', { user: req.session.user })
    });

    router.post('/edit/:id', helpers.isLoggedIn, function (req, res, next) {
        res.redirect('/projects')
    });

    router.get('/delete/:id', helpers.isLoggedIn, function (req, res, next) {
        res.redirect('/projects')
    });
    // end main project

    // start overview
    router.get('/overview/:projectid', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/overview/view', { user: req.session.user })
    });

    router.get('/activity/:projectid', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/activity/view', { user: req.session.user })
    });

    // start members
    router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/members/list', { user: req.session.user })
    });

    router.get('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/members/add', { user: req.session.user })
    });

    router.post('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        res.redirect(`/projects/members/${req.params.projectid}`)
    });

    router.get('/members/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/members/edit', { user: req.session.user })
    });

    router.post('/members/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
        res.redirect(`/projects/members/${req.params.projectid}`)
    });

    router.get('/members/:projectid/delete/:memberid', helpers.isLoggedIn, function (req, res, next) {
        res.redirect(`/projects/members/${req.params.projectid}`)
    });
    // end members

    // start issues
    router.get('/issues/:projectid', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/issues/list', { user: req.session.user })
    });

    router.get('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/issues/add', { user: req.session.user })
    });

    router.post('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        res.redirect(`/projects/issues/${req.params.projectid}`)
    });

    router.get('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/issues/edit', { user: req.session.user })
    });

    router.post('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
        res.redirect(`/projects/issues/${req.params.projectid}`)
    });

    router.get('/issues/:projectid/delete/:issueid', helpers.isLoggedIn, function (req, res, next) {
        res.redirect(`/projects/issues/${req.params.projectid}`)
    });
    // end issues

    return router;
}