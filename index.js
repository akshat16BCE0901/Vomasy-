const express = require('express');
const app = express();
const passport = require('passport');
const bodyParser = require('body-parser');
const formidable = require('formidable');
const passportSetup = require('./config/googlesignin');
const port = process.env.PORT || 3000;
const fs = require('fs');
const mysql = require('mysql');
app.set('view-engine','ejs');
app.use(express.static(__dirname + '/public'));
app.use(
    bodyParser({extended : true})
);

var con = mysql.createConnection({
    host: "us-cdbr-iron-east-02.cleardb.net",
    user: "b07faff88cfdbe",
    password: "c498db8f",
    database : "heroku_ef028838fef118f"
    // mysql://b07faff88cfdbe:c498db8f@us-cdbr-iron-east-02.cleardb.net/heroku_ef028838fef118f?reconnect=true
});


con.connect(function(err)
{
    if(err) throw err;

    app.get('/',function(req,res)
    {
        res.render('index.ejs',{"title": "Welcome","error":false});
    });

    app.get('/admin',function(req,res)
    {
        var query = "SELECT id,name from employees";
        con.query(query,function(err,result)
        {
            if(err) throw err;
            var q  = "SELECT * from events";
            con.query(q,function(err,r)
            {
                if(err) throw err;
                res.render('admin.ejs',{"data":result,"title":"Admin Panel","events":r});
            });
            
        });
    });

    app.get('/err',function(req,res)
    {
        res.render('index.ejs',{"title": "Welcome","error":true});
    });

    app.get('/auth/google',passport.authenticate('google',{
        scope : ['profile email']
    }));

    app.get('/auth/google/redirect',passport.authenticate('google'),function(req,res)
    {
        res.redirect('/');
    });

    app.post('/register',function(req,res)
    {
        var details = req.body;
        var name = details.name;
        var age = details.age;
        var email = details.email;
        var phone = details.phone;
        var address  = details.address;
        var skillset  = details.skillset;
        var company = details.company;
        var query = "INSERT INTO `volunteer`(`name`, `phone`, `email`, `age`, `address`, `skillset`, `company`, `num_events`, `totalhrs`) VALUES ('"+name+"','"+phone+"','"+email+"',"+age+",'"+address+"','"+skillset+"','"+company+"',0,0)";
        con.query(query,function(err,result)
        {
            if(err) throw err;
            var q  = "SELECT max(id) as id from volunteer";
            con.query(q,function(err,r)
            {
                if(err) throw err;
                res.render('login.ejs',{"data":r,"title":"Login Set Up"});
            });
        });
    });

    app.post('/empreg',function(req,res)
    {
        var details = req.body;
        var name = details.name;
        var age = details.age;
        var email = details.email;
        var phone = details.phone;
        var address  = details.address;
        var designation = details.designation;
        var query = "INSERT INTO `employees`(`name`, `email`, `age`, `phone`, `address`, `designation`) VALUES ('"+name+"','"+email+"',"+age+",'"+phone+"','"+address+"','"+designation+"')";
        con.query(query,function(err,result)
        {
            if(err) throw err;
            var q  = "SELECT max(id) as id from employees";
            con.query(q,function(err,r)
            {
                if(err) throw err;
                res.render('emplog.ejs',{"data":r,"title":"Login Set Up"});
            });
        });
    });

    app.post('/loginvalidate',function(req,res)
    {   
        var details = req.body;
        var username = details.username;
        var volid = details.volid;
        var pass= details.password;
        var query = "INSERT INTO `login`(`vol_id`, `username`, `password`, `role`) VALUES ("+volid+",'"+username+"','"+pass+"','volunteer')";
        con.query(query,function(err,result)
        {
            if(err) throw err;
            res.redirect('/');
        });
    });
    
    app.post('/emploginvalidate',function(req,res)
    {   
        var details = req.body;
        var username = details.username;
        var volid = details.volid;
        var pass= details.password;
        var query = "INSERT INTO `login`(`emp_id`, `username`, `password`, `role`) VALUES ("+volid+",'"+username+"','"+pass+"','employee')";
        con.query(query,function(err,result)
        {
            if(err) throw err;
            res.redirect('/');
        });
    });

    app.post('/login',function(req,res)
    {   
        var details = req.body;
        var username = details.username;
        var password = details.password;
        var role = details.role;
        var query = "SELECT * from login where username='"+username+"' and password='"+password+"' and role='"+role+"'";
        con.query(query,function(err,result)
        {
            if(result.length>0)
            {
                if(role=="employee")
                {
                    var eves = " select * from events where coordinator_id="+result[0].emp_id;
                    con.query(eves,function(err,events)
                    {
                        if(err) throw err;
                        res.render('empdashboard.ejs',{"title":"Dashboard | "+result[0].username,"events":events});
                    });

                }
                else
                {
                    var eves = "select A.*,B.name as cname,B.phone as cphone from `events` as A inner join `employees` as B on A.coordinator_id = B.id where A.id not in (select `event_id` from `event_volunteers` where `vol_id`='"+result[0].vol_id+"')";
                    con.query(eves,function(err,events)
                    {
                        if(err) throw err;
                        var applied_eve = "select * ,B.status as can_sta,C.name as cname,C.phone,A.name as ename from events as A inner join event_volunteers as B on A.id = B.event_id inner join employees as C on A.coordinator_id=C.id where B.vol_id="+result[0].vol_id;
                        con.query(applied_eve,function(err,result2)
                        {
                            if(err) throw err;
                            var pics = "select A.id as event_id,A.name as event_name,A.status as event_status,A.city,A.state,C.id as volid,C.name as volname from events as A inner join event_volunteers as B on A.id=B.event_id inner join volunteer as C on B.vol_id=C.id where B.status='Approved' and A.status='scheduled' and C.id="+result[0].vol_id;
                            con.query(pics,function(err,result3)
                            {
                                res.render('dashboard.ejs',
                                {
                                    "title":"Dashboard | "+result[0].username,
                                    "events":events,
                                    "vol_id": result[0].vol_id,
                                    "applied_events" : result2,
                                    "pics":result3
                                });
                            });
                        });
                    });
                    
                }
            }
            else{
                res.redirect('/err');
            }
        });
    });

    app.post('/addevent',function(req,res)
    {
        var details = req.body;
        var name = details.name;
        var desc = details.desc;
        var event_from = details.event_from;
        var event_to = details.event_to;
        var limit = details.limit;
        var address = details.address;
        var city = details.city;
        var state = details.state;
        var coordinator = details.coordinator;
        var coords = details.coords;
        var query = "INSERT INTO `events`(`name`, `Description`, `event_from`, `event_to`, `candidate_limit`, `local_addr`, `city`, `state`, `coords`, `status`, `coordinator_id`) VALUES ('"+name+"','"+desc+"','"+event_from+"','"+event_to+"',"+limit+",'"+address+"','"+city+"','"+state+"','"+coords+"','scheduled','"+coordinator+"')";
        con.query(query,function(error,result)
        {
            if(error) throw error;
            res.redirect('/admin');
        });
    });

    app.post('/applyforevent',function(req,res)
    {
        var details = req.body;
        var event_id = details.event;
        var vol_id = details.volid;
        var query = "INSERT INTO `event_volunteers`(`event_id`, `vol_id`, `status`) VALUES ("+event_id+","+vol_id+",'Applied')";
        con.query(query,function(err,result)
        {
            if(err){
                res.send("Error");
            }
            res.send(result);
        });
    });

    app.get('/selectcandidates/:id',function(req,res)
    {
        var idw = req.params.id;
        var eve_candidates = "select A.id as eve_id,A.name as eve_name,A.coordinator_id,A.candidate_limit as l,B.status,C.id,C.name,C.skillset,C.company from events as A inner join event_volunteers as B on A.id=B.event_id inner join volunteer as C on B.vol_id = C.id where B.event_id="+idw;
        con.query(eve_candidates,function(err,result)
        {
            if(err) throw err;
            var c = "select name,phone from employees where id="+result[0].coordinator_id;
            con.query(c,function(err,r)
            {
                if(err) throw err;
                var summary = "select status,count(*) as c from event_volunteers where event_id="+idw+" group by status";
                con.query(summary,function(err,result3)
                {
                    res.render('event_manage.ejs',{"events": result,"title": "Candidate Selection","coordinator":r,"summary":result3});
                });
            });
        });
    });

    app.post('/updatestatus',function(req,res)
    {
        var details = req.body;
        var event_id = details.event_id;
        var vol_id = details.vol_id;
        var status = details.new_status;
        var query = "UPDATE `event_volunteers` SET `status`='"+status+"' WHERE `vol_id`= "+vol_id+" and `event_id`="+event_id;
        con.query(query,function(err,result)
        {
            if(err)
            { 
                res.send("Error"); 
            }
            else
            {
                res.send("Updated");
            }
            
        });
    });

    app.post('/imageupload',function(req,res)
    {
        
        var form = new formidable.IncomingForm();
        form.parse(req,function(err,fields,files)
        {
            var eid = fields.eid;
            var volid = fields.volid;
            var oldpath= files.filetoupload.path;
            var d = Date.now();
            var dir = __dirname+'/public/event_images/'+eid+'/';
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            var newpath =  dir+ d + files.filetoupload.name;
            fs.rename(oldpath,newpath,function(err)
            {
                if(err) throw err;
                var query = "INSERT into `event_pics`(`event_id`,`vol_id`,`link`) VALUES("+eid+","+volid+",'"+d+files.filetoupload.name+"')";
                con.query(query,function(err,resss)
                {
                    if(err) throw err;
                    res.send(resss);
                });
            });
        });
    });

    app.get('/updateeventinfo/:id',function(req,res)
    {
        var event_id = req.params.id;
        console.log(event_id);
        var eve_candidates = "select B.attendance,C.id,C.name,C.skillset,C.company from events as A inner join event_volunteers as B on A.id=B.event_id inner join volunteer as C on B.vol_id = C.id where B.event_id="+event_id;
        con.query(eve_candidates,function(err,result)
        {
            if(err) throw err;
            console.log(result);
            res.render('updateeventinfo.ejs',{"title":"Update Event Info","event_id": event_id,"volunteers":result});
        });
    });
    app.post('/changeattendance',function(req,res)
    {
        var details = req.body;
        var event_id = details.event_id;
        var vol_id = details.vol_id;
        var status = details.status;
        var query = "UPDATE `event_volunteers` SET `attendance`='"+status+"' where `event_id`="+event_id+" and `vol_id`="+vol_id;
        con.query(query,function(err,result)
        {
            if(err) throw err;
            console.log(result);
            res.send(result);
        })
    });
});

app.listen(port,function()
{
    console.log("server listening on port : "+port);
});