var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');

let checkOption = {
    id: true,
    name: true,
    member: true
}

/* GET home page. */
module.exports = (db) => {

    // start main project
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        let link = 'projects'
        let user = req.session.user
        let getData = `SELECT count(id) AS total from (SELECT DISTINCT projects.projectid as id FROM projects 
                       LEFT JOIN members ON members.projectid = projects.projectid 
                       LEFT JOIN users ON users.userid = members.userid`

        let temp = []

        if (req.query.checkId && req.query.id) {
            temp.push(`projects.projectid=${req.query.id}`)
        }

        if (req.query.checkName && req.query.name) {
            temp.push(`projects.name ILIKE '%${req.query.name}%'`)
        }

        if (req.query.checkMember && req.query.member) {
            temp.push(`members.userid=${req.query.member}`)
        }

        if (temp.length > 0) {
            getData += ` WHERE ${temp.join(" AND ")}`
        }

        getData += `) AS projectname`;

        db.query(getData, (err, totaldata) => {
            if (err) return res.json(err)

            //pagination
            const url = req.url == '/' ? '/?page=1' : req.url;
            const page = req.query.page || 1;
            const limit = 3;
            const offset = (page - 1) * limit;
            const total = totaldata.rows[0].total;
            const pages = Math.ceil(total / limit);

            let getData = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname, ', ') as member FROM projects 
                          LEFT JOIN members ON members.projectid = projects.projectid 
                          LEFT JOIN users ON users.userid = members.userid`;

            if (temp.length > 0) {
                getData += ` WHERE ${temp.join(' OR ')}`
            };

            getData += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset};`

            db.query(getData, (err, dataProject) => {
                if (err) return res.json(err) 

                let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users;`;

                db.query(getUser, (err, dataUser) => {
                    if (err) return res.json(err)

                    res.render('projects/view', {
                        link,
                        url,
                        page,
                        pages,
                        user,
                        hasil: dataProject.rows,
                        result: dataUser.rows,
                        option: checkOption,
                        login: user
                    });
                });
            });
        });
    });

    router.post('/option', helpers.isLoggedIn, (req, res) => {
        console.log('test')
        
        checkOption.id = req.body.checkColId;
        checkOption.name = req.body.checkColName;
        checkOption.member = req.body.checkColMembers;

        res.redirect('/projects');
    });

    router.get('/add', helpers.isLoggedIn, function (req, res, next) {
        let link = 'projects'
        let sql = `SELECT DISTINCT userid, CONCAT (firstname, ' ',lastname) AS fullname FROM users ORDER BY fullname`
        db.query(sql, (err, data) => {
            if (err) return res.json(err)
            res.render('projects/add', {
                link,
                data: data.rows,
                login: req.session.user
            })
        })
    });

    router.post('/add', helpers.isLoggedIn, function (req, res, next) {
        let members = req.body.members;
        let sql = `INSERT INTO projects (name) values('${req.body.addProjectName}')`
        db.query(sql, (err) => {
            if (err) {
                return res.send(err)
            } else {
                db.query('SELECT projectid FROM projects ORDER BY projectid desc limit 1', (err, projectid) => {
                    if (err) {
                        return res.send(err)
                    }
                    let id = projectid.rows[0].projectid;
                    let temp = [];
                    for (let i = 0; i < members.length; i++) {
                        temp.push(`(${members[i]}, ${id})`)
                    }
                    db.query(`INSERT INTO members (userid, projectid) values ${temp.join(',')}`, (err, data) => {
                        res.redirect('/projects')
                    })
                })
            }
        })
    });

    router.get('/edit/:projectid', helpers.isLoggedIn, function (req, res, next) {
        let id = req.params.projectid
        let link = 'projects'
        let sql = `SELECT projects.name FROM projects WHERE projects.projectid = ${id}`
        let fullName = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`
        let sqlMember = `SELECT members.userid, projects.name, projects.projectid FROM members 
                        LEFT JOIN projects ON members.projectid = projects.projectid WHERE projects.projectid = ${id}`


        db.query(sql, (err, data) => {
            if (err) {
                return res.send(err);
            }

            let projectName = data.rows[0];
            db.query(fullName, (err, member) => {
                if (err) {
                    return res.send(err);
                }

                let members = member.rows;
                db.query(sqlMember, (err, membersData) => {
                    if (err) {
                        return res.send(err)
                    }

                    let dataMember = membersData.rows.map(item => item.userid)
                    res.render('projects/edit', {
                        login: req.session.user,
                        projectName,
                        members,
                        link,
                        dataMember
                    })
                })

            })

        })
    });

    router.post('/edit/:projectid', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        const {
            editProjectName,
            editMembers
        } = req.body
        let sqlProjectName = `UPDATE projects SET name = '${editProjectName}' WHERE projectid = ${projectid}`

        if (projectid && editProjectName && editMembers) {

            db.query(sqlProjectName, (err) => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })

                let sqlDeleteMember = `DELETE FROM members WHERE projectid = ${projectid}`

                db.query(sqlDeleteMember, (err) => {
                    if (err) return res.status(500).json({
                        error: true,
                        message: err
                    })

                    let result = [];

                    if (typeof editMembers == 'string') {
                        result.push(`(${editMembers},${projectid})`);
                    } else {
                        for (let i = 0; i < editMembers.length; i++) {
                            result.push(`(${editMembers[i]},${projectid})`)
                        }
                    }

                    let sqlUpdate = `INSERT INTO members (userid, projectid) VALUES ${result.join(",")}`

                    db.query(sqlUpdate, (err) => {
                        if (err) return res.status(500).json({
                            error: true,
                            message: err
                        })
                        res.redirect('/projects')
                    })
                })
            })
        } else {
            res.redirect(`/projects/edit/${projectid}`)
        }
    });

    router.get('/delete/:projectid', helpers.isLoggedIn, function (req, res, next) {
        const id = parseInt(req.params.projectid)
        let memberData = `DELETE FROM members WHERE projectid = ${id}`;
        db.query(memberData, (err) => {
            if (err) {
                return res.send(err)
            }
            let projectData = `DELETE FROM projects WHERE projectid = ${id}`;
            db.query(projectData, (err) => {
                if (err) {
                    return res.send(err)
                }
                res.redirect('/projects')
            })
        })
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
        res.render('projects/members/view', { user: req.session.user })
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