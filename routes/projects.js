var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
var path = require('path')
var moment = require('moment')

let checkOption = {
    id: true,
    name: true,
    member: true
}

let memberOption = {
    id: true,
    name: true,
    position: true
}

let issueOption = {
    checkColId: true,
    checkColSubject: true,
    checkColTracker: true,
    checkColDescription: true,
    checkColStatus: true,
    checkColPriority: true,
    checkColStartDate: true,
    checkColDueDate: true,
    checkColEstimatedTime: true,
    checkColDone: true
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
                        user,
                        page,
                        pages,
                        hasil: dataProject.rows,
                        result: dataUser.rows,
                        option: checkOption,
                        user: req.session.user
                    });
                });
            });
        });
    });

    router.post('/option', helpers.isLoggedIn, (req, res) => {
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
                user: req.session.user
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
                    if (err) return res.send(err)

                    let data = projectid.rows[0]
                    let id = data.projectid;
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
            if (err) return res.send(err)

            let projectName = data.rows[0];
            db.query(fullName, (err, member) => {
                if (err) return res.send(err)

                let members = member.rows;
                db.query(sqlMember, (err, membersData) => {
                    if (err) return res.send(err)

                    let dataMember = membersData.rows.map(item => item.userid)
                    res.render('projects/edit', {
                        user: req.session.user,
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
                if (err) return res.send(err)

                let sqlDeleteMember = `DELETE FROM members WHERE projectid = ${projectid}`

                db.query(sqlDeleteMember, (err) => {
                    if (err) return res.send(err)

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
                        if (err) return res.send(err)

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
            if (err) return res.send(err)

            let projectData = `DELETE FROM projects WHERE projectid = ${id}`;
            db.query(projectData, (err) => {
                if (err) return res.send(err)

                res.redirect('/projects')
            })
        })
    });
    // end main project

    // start overview
    router.get('/overview/:projectid', helpers.isLoggedIn, function (req, res, next) {
        let link = 'projects'
        let id = req.params.projectid
        let url = 'overview'
        let sqlProject = `SELECT * FROM projects WHERE projectid = ${id}`

        db.query(sqlProject, (err, dataProject) => {
            if (err) return res.send(err)

            let sqlMember = `SELECT users.firstname, users.lastname, members.role FROM members
                            LEFT JOIN users ON members.userid = users.userid WHERE members.projectid = ${id}`
            db.query(sqlMember, (err, dataMember) => {
                if (err) return res.send(err)

                let sqlIssue = `SELECT tracker, status FROM issues WHERE projectid = ${id}`
                db.query(sqlIssue, (err, dataIssue) => {
                    if (err) return res.send(err)
                    let bugOpen = 0;
                    let bugTotal = 0;
                    let featureOpen = 0;
                    let featureTotal = 0;
                    let supportOpen = 0;
                    let supportTotal = 0;

                    dataIssue.rows.forEach(item => {
                        if (item.tracker == 'Bug' && item.status !== 'closed') {
                            bugOpen += 1
                        }
                        if (item.tracker == 'Bug') {
                            bugTotal += 1
                        }
                    })

                    dataIssue.rows.forEach(item => {
                        if (item.tracker == 'Feature' && item.status !== 'closed') {
                            featureOpen += 1
                        }
                        if (item.tracker == 'Feature') {
                            featureTotal += 1
                        }
                    })

                    dataIssue.rows.forEach(item => {
                        if (item.tracker == 'Support' && item.status !== 'closed') {
                            supportOpen += 1
                        }
                        if (item.tracker == 'Support') {
                            supportTotal += 1
                        }
                    })
                    res.render('projects/overview/view', {
                        id,
                        link,
                        url,
                        bugOpen,
                        bugTotal,
                        featureOpen,
                        featureTotal,
                        supportOpen,
                        supportTotal,
                        user: req.session.user,
                        data: dataProject.rows[0],
                        members: dataMember.rows
                    })
                })
            })
        })
    });

    router.get('/activity/:projectid', helpers.isLoggedIn, function (req, res, next) {
        let id = req.params.projectid;
        const link = 'projects';
        const url = 'activity';

        let sqlProject = `SELECT * FROM projects WHERE projectid = ${id}`
        db.query(sqlProject, (err, dataProject) => {
            if (err) return res.send(err)

            let project = dataProject.rows[0];
            let sqlActivity = `SELECT activity.*, CONCAT(users.firstname,' ',users.lastname) AS authorname,
                              (time AT TIME ZONE 'Asia/Jakarta'):: time AS timeactivity, 
                              (time AT TIME ZONE 'Asia/Jakarta'):: date AS dateactivity
                              FROM activity
                              LEFT JOIN users ON activity.author = users.userid WHERE projectid= ${id} 
                              ORDER BY dateactivity DESC, timeactivity DESC`

            db.query(sqlActivity, (err, dataActivity) => {
                if (err) return res.send(err)

                let activity = dataActivity.rows;
                
                activity.forEach(item => {
                    item.dateactivity = moment(item.dateactivity).format('YYYY-MM-DD')
                    item.timeactivity = moment(item.timeactivity, 'HH:mm:ss.SSS').format('HH:mm');

                    if (item.dateactivity == moment().format('YYYY-MM-DD')) {
                        item.dateactivity = 'Today'
                    } else if (item.dateactivity == moment().subtract(1, 'days').format('YYYY-MM-DD')) {
                        item.dateactivity = 'Yesterday'
                    } else {
                        item.dateactivity = moment(item.dateactivity).format('MMMM Do, YYYY')
                    }
                })
                
                res.render(`projects/activity/view`, {
                    moment,
                    activity,
                    link,
                    url,
                    id,
                    project,
                    user: req.session.user
                })
            })
        })
    });

    // start members
    router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
        let id = req.params.projectid;
        let link = 'projects'
        let url = 'members'
        let sql = `SELECT COUNT(member) AS total FROM(SELECT members.userid FROM members
                  JOIN users ON members.userid = users.userid WHERE members.projectid = ${id}`

        let result = [];

        if (req.query.checkId && req.query.id) {
            result.push(`members.id = ${req.query.id}`)
        }

        if (req.query.checkName && req.query.name) {
            result.push(`CONCAT(users.firstname, ' ', users.lastname) LIKE '%${req.query.name}%'`)
        }

        if (req.query.checkPosition && req.query.position) {
            result.push(`members.role = '${req.query.position}'`)
        }

        if (result.length > 0) {
            sql += ` AND ${result.join(' AND ')}`
        }
        sql += `) AS member`

        db.query(sql, (err, totalData) => {
            if (err) return res.send(err)

            const pageUrl = (req.url == `/${id}/members`) ? `/${id}/members/?page=1` : req.url;
            const page = req.query.page || 1;
            const limit = 3
            const offset = (page - 1) * limit
            const count = totalData.rows[0].total
            const pages = Math.ceil(count / limit);

            let sqlMember = `SELECT users.userid, projects.name, projects.projectid, members.id, members.role, 
                            CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members
                            LEFT JOIN projects ON projects.projectid = members.projectid
                            LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${id}`

            if (result.length > 0) {
                sqlMember += ` AND ${result.join(' AND ')}`
            }

            sqlMember += ` ORDER BY members.role ASC`
            sqlMember += ` LIMIT ${limit} OFFSET ${offset}`

            db.query(sqlMember, (err, dataMember) => {
                if (err) return res.send(err)

                let sqlProjects = `SELECT * FROM projects WHERE projectid = ${id}`
                db.query(sqlProjects, (err, dataProject) => {
                    if (err) return res.send(err)

                    res.render('projects/members/view', {
                        id,
                        url,
                        link,
                        pages,
                        page,
                        pageUrl,
                        project: dataProject.rows[0],
                        members: dataMember.rows,
                        option: memberOption,
                        user: req.session.user
                    })
                })
            })
        })
    });

    router.post('/members/:projectid/option', helpers.isLoggedIn, (req, res) => {
        const id = req.params.projectid;

        memberOption.id = req.body.checkColId;
        memberOption.name = req.body.checkColName;
        memberOption.position = req.body.checkColPosition;
        res.redirect(`/projects/members/${id}`)
    });

    router.get('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        const id = req.params.projectid;
        const link = 'projects';
        const url = 'members'
        let sqlProjects = `SELECT * FROM projects WHERE projectid = ${id}`
        db.query(sqlProjects, (err, dataProject) => {
            if (err) return res.send(err)

            let sqlMembers = `SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname FROM users WHERE userid NOT IN (SELECT userid FROM members WHERE projectid = ${id})`
            db.query(sqlMembers, (err, dataMember) => {
                if (err) return res.send(err)

                res.render('projects/members/add', {
                    id,
                    link,
                    url,
                    members: dataMember.rows,
                    project: dataProject.rows[0],
                    user: req.session.user
                })
            })
        })
    });

    router.post('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        const id = req.params.projectid;
        db.query(`INSERT INTO members(userid, role, projectid) VALUES ($1, $2, $3)`, [req.body.addMemberName, req.body.position, id], (err) => {
            if (err) return res.send(err)

            res.redirect(`/projects/members/${id}`)
        })
    });

    router.get('/members/:projectid/edit/:id', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        let id = req.params.id
        let link = 'projects'
        let url = 'members'
        let sqlMember = `SELECT members.id, CONCAT(users.firstname, ' ',users.lastname) AS fullname, members.role FROM members
                         LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${projectid} AND id = ${id}`

        db.query(sqlMember, (err, dataMember) => {
            if (err) return res.send(err)

            let sqlProjects = `SELECT * FROM projects WHERE projectid = ${projectid}`
            db.query(sqlProjects, (err, dataProject) => {
                if (err) return res.send(err)

                res.render('projects/members/edit', {
                    id,
                    link,
                    url,
                    member: dataMember.rows[0],
                    project: dataProject.rows,
                    user: req.session.user
                })
            })
        })

    });

    router.post('/members/:projectid/edit/:id', helpers.isLoggedIn, (req, res) => {
        let projectid = req.params.projectid;
        let id = req.params.id;
        let position = req.body.editPosition

        db.query(`UPDATE members SET role = '${position}' WHERE id = ${id}`, (err) => {
            if (err) return res.send(err)

            res.redirect(`/projects/members/${projectid}`)
        })
    });

    router.get('/members/:projectid/delete/:memberid', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid;
        let id = req.params.id;

        db.query(`DELETE FROM members WHERE projectid = ${projectid} AND id = ${id}`, (err) => {
            if (err) return res.send(err)

            res.redirect(`/projects/members/${projectid}`)
        })
    });
    // end members

    // start issues
    router.get('/issues/:projectid', helpers.isLoggedIn, function (req, res, next) {
        let id = req.params.projectid
        let link = 'projects'
        let url = 'issues'
        let sql = `SELECT * FROM projects WHERE projectid = ${id}`

        let result = [];
        let search = "";

        if (req.query.checkId && req.query.id) {
            result.push(`issues.issueid = ${req.query.id}`)
        }

        if (req.query.checkSubject && req.query.subject) {
            result.push(`issues.subject ILIKE '%${req.query.subject}%'`)
        }

        if (req.query.checkTracker && req.query.tracker) {
            result.push(`issues.tracker = '${req.query.tracker}'`)
        }

        if (result.length > 0) {
            search += ` AND ${result.join(' AND ')}`
        }

        let sqlTotal = `SELECT COUNT(issueid) AS total FROM issues WHERE projectid = ${id} ${search}`

        db.query(sql, (err, dataProject) => {
            if (err) return res.send(err)

            let project = dataProject.rows[0];
            db.query(sqlTotal, (err, totalData) => {
                if (err) return res.send(err)

                let total = totalData.rows[0].total;

                const pageUrl = req.url == `/${id}/issues` ? `/${id}/issues/?page=1` : req.url;

                const page = req.query.page || 1;
                const limit = 3;
                const offset = (page - 1) * limit;
                const pages = Math.ceil(total / limit);

                let sqlIssue = `SELECT issues.*, CONCAT(users.firstname, ' ', users.lastname) AS authorname FROM issues
                                LEFT JOIN users ON issues.author = users.userid WHERE issues.projectid = ${id} ${search}
                                ORDER BY issues.issueid ASC LIMIT ${limit} OFFSET ${offset}`

                db.query(sqlIssue, (err, dataIssue) => {
                    if (err) return res.send(err)

                    let issues = dataIssue.rows
                    let dataAssignee = `SELECT users.userid, CONCAT(firstname, ' ', lastname) AS fullname FROM members
                                       LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${id}`

                    db.query(dataAssignee, (err, assigneeData) => {
                        if (err) return res.send(err)

                        let assignee = assigneeData.rows
                        res.render('projects/issues/view', {
                            project,
                            issues,
                            assignee,
                            id,
                            link,
                            url,
                            page,
                            pages,
                            pageUrl,
                            user: req.session.user,
                            option: issueOption,
                        })
                    })
                })
            })
        })
    });

    router.post('/issues/:projectid', helpers.isLoggedIn, (req, res) => {
        const id = req.params.projectid

        issueOption.checkId = req.body.checkColId
        issueOption.checkSubject = req.body.checkColSubject
        issueOption.checkTracker = req.body.checkColTracker
        issueOption.checkDescription = req.body.checkColDescription
        issueOption.checkStatus = req.body.checkColStatus
        issueOption.checkPriority = req.body.checkColPriority
        issueOption.checkStartDate = req.body.checkColStartDate
        issueOption.checkDueDate = req.body.checkColDueDate
        issueOption.checkEstimatedTime = req.body.checkColEstimatedTime
        issueOption.checkDone = req.body.checkColDone

        res.redirect(`/projects/issues/${id}`)
    })

    router.get('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        let id = req.params.projectid
        let link = 'projects'
        const url = 'issues'

        let sql = `SELECT * FROM projects WHERE projectid = ${id}`;
        db.query(sql, (err, dataProject) => {
            if (err) return res.send(err)

            let sqlMembers = `SELECT users.userid, CONCAT(users.firstname, ' ', users.lastname) AS fullname FROM members
                              LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${id}`
            db.query(sqlMembers, (err, dataMember) => {
                if (err) return res.send(err)

                res.render('projects/issues/add', {
                    id,
                    link,
                    url,
                    project: dataProject.rows[0],
                    members: dataMember.rows,
                    user: req.session.user
                })
            })
        })
    });

    router.post('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        let id = parseInt(req.params.projectid)
        let user = req.session.user
        let file = req.files.file;
        let filename = file.name.toLowerCase().replace('', Date.now()).split(' ').join('-');
        let sql = `INSERT INTO issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, createddate)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`
        let value = [id, req.body.tracker, req.body.subject, req.body.description, req.body.status, req.body.priority, parseInt(req.body.assignee), req.body.startDate, req.body.dueDate, parseInt(req.body.estimatedTime), parseInt(req.body.done), filename, user.userid]

        db.query(sql, value, (err) => {
            if (err) return res.send(err)
            file.mv(path.join(__dirname, '..', 'public', 'upload', filename), (err) => {
                if (err) return res.send(err)

                res.redirect(`/projects/issues/${id}`)
            })
        })
    });

    router.get('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
        let id = req.params.projectid;
        let issueid = req.params.issueid;
        let link = 'projects';
        let url = 'issues'

        let sqlProject = `SELECT * FROM projects WHERE projectid = ${id}`;
        db.query(sqlProject, (err, dataProject) => {

            if (err) return res.send(err)
            let sqlIssue = `SELECT issues.*, CONCAT(users.firstname, ' ', users.lastname) AS authorname FROM issues
                            LEFT JOIN users ON issues.author = users.userid WHERE projectid = ${id} AND issueid = ${issueid}`;

            db.query(sqlIssue, (err, dataIssue) => {

                if (err) return res.send(err)

                let sqlMembers = `SELECT users.userid, CONCAT(users.firstname, ' ', users.lastname) AS fullname FROM members
                                  LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${id}`

                db.query(sqlMembers, (err, dataMember) => {
                    if (err) return res.send(err)
                    let sqlParent = `SELECT subject, tracker, issueid FROM issues WHERE projectid = ${id}`

                    db.query(sqlParent, (err, dataParent) => {
                        if (err) return res.send(err)
                        res.render('projects/issues/edit', {
                            id,
                            link,
                            url,
                            moment,
                            project: dataProject.rows[0],
                            issue: dataIssue.rows[0],
                            members: dataMember.rows,
                            parent: dataParent.rows,
                            user: req.session.user
                        })
                    })
                })
            })
        })
    });

    router.post('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
        let id = parseInt(req.params.projectid);
        let issueid = parseInt(req.params.issueid);
        let formEdit = req.body;
        let user = req.session.user;

        let title = `${formEdit.subject}#${issueid}(${formEdit.tracker}):${formEdit.description}`
        let sqlActivity = `INSERT INTO activity(time, title, description, author, projectid)
                           VALUES (NOW(), $1, $2, $3, $4)`
        let value = [title, formEdit.description, user.userid, id]

        if (req.files) {
            let file = req.files.file
            let filename = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-")
            let sqlUpdate = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, 
                             assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, 
                             targetversion = $10, files = $11, updateddate = $12 ${formEdit.status == 'Closed' ? `, closeddate = NOW() ` : " "} 
                             WHERE issueid = $13`
            let values = [formEdit.subject, formEdit.description, formEdit.status, formEdit.priority,
            parseInt(formEdit.assignee), formEdit.dueDate, parseInt(formEdit.done), parseInt(formEdit.parenttask),
            parseInt(formEdit.spenttime), formEdit.target, filename, 'NOW()', issueid]

            db.query(sqlUpdate, values, (err) => {
                if (err) return res.send(err)

                file.mv(path.join(__dirname, "..", "public", "upload", filename), (err) => {
                    if (err) return res.send(err)

                    db.query(sqlActivity, value, (err) => {
                        if (err) return res.send(err)
                        
                        res.redirect(`/projects/issues/${id}`)
                    })
                })
            })
        } else {
            let sqlUpdate = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, targetversion = $10, updateddate = $11 ${formEdit.status == 'closed' ? `, closeddate = NOW() ` : " "} WHERE issueid = $12`
            let values = [formEdit.subject, formEdit.description, formEdit.status, formEdit.priority, parseInt(formEdit.assignee), formEdit.dueDate, parseInt(formEdit.done), parseInt(formEdit.parenttask), parseInt(formEdit.spenttime), formEdit.target, 'NOW()', issueid]
            db.query(sqlUpdate, values, (err) => {
                if (err) return res.send(err)

                res.redirect(`/projects/issues/${id}`)
            })
        }
    });

    router.get('/issues/:projectid/delete/:issueid', helpers.isLoggedIn, function (req, res, next) {
        let id = req.params.projectid;
        let issueid = req.params.issueid;

        let sqlDelete = `DELETE FROM issues WHERE projectid = $1 AND issueid = $2`
        db.query(sqlDelete, [id, issueid], (err) => {
            if (err) return res.send(err)
            res.redirect(`/projects/issues/${id}`)
        })
    });
    // end issues

    return router;
}