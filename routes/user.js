var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'), //mongo connection
    bodyParser = require('body-parser'), //parses information from POST
    methodOverride = require('method-override'); //used to manipulate POST
var userInfo = require('../models/userschema');
var ObjectID = require('mongodb').ObjectID;
var jwt = require('jsonwebtoken');
var querystring = require('querystring');
var http = require('http');
var app = express();
var config = require('../config/appconfig');
var fs = require('fs');
var path = require('path');
var multer = require('multer');

//Any requests to this controller must pass through this 'use' function
//Copy and pasted from method-override
router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
}))

//build the REST operations at the base for blobs
//this will be accessible from http://127.0.0.1:3000/blobs if the default route for / is left unchanged
router.route('/')
    //GET all blobs
    .get(function(req, res, next) {
        //retrieve all blobs from Monogo
        userInfo.find({}, function (err, users) {
              if (err) {
                  return console.error(err);
              } else {
                  //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
                  res.format({
                      //HTML response will render the index.jade file in the views/blobs folder. We are also setting "blobs" to be an accessible variable in our jade view
                    html: function(){
                        res.render('users/index', {
                              title: 'All my users',
                              "users" : users
                          });
                    },
                    //JSON response will show all blobs in JSON format
                    json: function(){
                        res.json(users);
                    }
                });
              }     
        });
    });

router.route('/signup')
    .post(function(req, res) {
        var nick = userInfo.create({
            _id: new ObjectID(),
            username: req.body.idname, 
            password: req.body.password,
            email: req.body.email,
            phone : req.body.phone,
            friends : '',
            requestfriendlist : '',
            isLoggedIn : false,
            deviceToken : '',
            osType : '',
        },function(error, user){
            if(error){
                //throw error;
                return res.json({ success: false ,message : 'exception occured'});
            } 
            else{
                console.log('User saved successfully');
                return res.json({ success: true });
            }
        });
    });
/*
router.route('/loginWithSocialMedia')
    .post(function(req, res, next)
    {
        var usVeri ;
        userVerification(req.body.idname, function(result){
            usVeri = result;
            if(usVeri != null){
                if(usVeri.email == req.body.idname)
                {
                    var token = jwt.sign(usVeri, config.secret, {
                                    expiresIn : 60*60*24 // expires in 24 hours
                                });
                    return res.json({ success: true, token:token});
                }
                else{
                    return res.json({ success: false, message:'Login failed'});
                }
            }
            else
            {
               var newUser = userInfo.create({
                    _id: new ObjectID(),
                    username: req.body.name, 
                    email: req.body.email,
                    imageUrl : req.body.imageUrl,
                    isSocial: true
                },function(error, user){
                    if(error){
                        return res.json({ success: false });
                    } 
                    else{
                        console.log('User saved successfully');
                        var token = jwt.sign(user, config.secret, {
                            expiresIn : 60*60*24 // expires in 24 hours
                        });
                        return res.json({ success: true, token:token});
                    }
                });
            }
        });
    });
*/
function emailPhoneVerification(email, phone ,done){
    if(email != ''){
        var userDB = new userInfo({email : email});
        userDB.FindByEmail(function(err, users){
            if(err || !users || users.length == 0){
                return done(null);
            }
            else
            {
                return done(users[0]);
            }
        });
    }
    if(phone != ''){
        var userDB1 = new userInfo({phone : phone});
        userDB1.FindByPhone(function(err1, users1){
            if(err1 || !users1 || users1.length == 0){
                return done(null);
            }
            else{
                return done(users1[0]);
            }
        });
    }
}
function userNameVerification(userName, done){
    var userDB = new userInfo({username : userName});
    
    userDB.FindByUserName(function(err, users){
        if(err)
        {
            return done(null);
        }
        if(!users || users.length == 0)
        {
            return done(null);
        }
        else
        {
            return done(users[0]);
        }
    });
}

function userVerification(idName,email, phone, done){
    var rsOfMailVerification, rsOfNameVerification ;
    emailPhoneVerification(email, phone, function(rst){
        rsOfMailVerification = rst;
        userNameVerification(idName, function(rst1){
            rsOfNameVerification = rst1;
            if(rsOfMailVerification == null && rsOfNameVerification == null){
                return done(null);
            }
            if(rsOfMailVerification != null){
                return done(rsOfMailVerification);
            }
            if(rsOfNameVerification != null){
                return done(rsOfNameVerification);
            }
        });
    });
}

router.route('/login')
    .post(function(req, res, next){
        var resultOfVerification;
        userNameVerification(req.body.idname,  function(result){
            resultOfVerification = result;
            if(resultOfVerification != null)
            {
                if(resultOfVerification.password == req.body.password)
                {
                    var doc = {
                        _id: resultOfVerification._id,
                        username: resultOfVerification.username,
                        password: resultOfVerification.password,
                        email: resultOfVerification.email,
                        phone :resultOfVerification.phone,
                        isLoggedIn : true,
                        deviceToken : req.body.deviceToken,
                        osType : req.body.osType,
                    }
                    
                    resultOfVerification.update(doc, function(err,raw){
                        if(err)
                        {
                            return res.json({ success: false });
                        }
                        else{
                            var token = jwt.sign(resultOfVerification, config.secret, {
                                expiresIn : 60*60*24 }); // expire in 24 hours
                            return res.json({success : true, token:token});
                        }
                    });
                }
                else
                {
                    return res.json({ success: false, message: 'Authentication failed. Password is incorrect.' });
                }
            }
            else
            {
                return res.json({ success: false, message: 'Authentication failed User not found.' });
            }
        });
    });

/*
function tokenVerify(tk, done){
    if(tk){
        jwt.verify(tk, config.secret, function(err, decoded) {      
            if (err) {
                return done(null);
            } 
            else {
                return done('valid');
            }
        });
    }
    else{
        return done(null);
    }
}

router.route('/authtoken')
    .post(function(req, res, next){
        var token = req.body.token || req.query.token || req.headers['x-access-token'];

        // decode token
        tokenVerify(token, function(result){
            if(result == 'valid')
            {
                return res.json({ success: true, message: 'Valid token' });
            }
            else {
               return json({ success: false, message: 'No Token provided!' });
            }
        });
    });

router.route('/getAvatar')
    .post(function(req, res, next){
        var token = req.body.token || req.query.token || req.headers['x-access-token'];

        // decode token
        tokenVerify(token, function(result){
            if (result == 'valid')
            {
                userVerification(req.body.idname, function(rst){
                    var usvfy = rst;
                    if(usvfy != null){
                        return res.json({ success: true, avatar: usvfy.imageUrl });
                    }
                    else{
                        return res.json({ success: false, message: 'Authentication failed. User not found.' });
                    }
                });
            }
            else {
                return json({ success: false, message: 'token is invalid' });
            }
        });
    });

router.route('/getProfileInfo')
    .post(function(req, res, next){
        var token = req.body.token || req.query.token || req.headers['x-access-token'];

        // decode token
        tokenVerify(token, function(result){
            if (result == 'valid')
            {
                userVerification(req.body.idname, function(rst){
                    var usvfy = rst;
                    if(usvfy != null)
                    {
                        return res.json({ success: true, profileInfo: usvfy });
                    }
                    else{
                        return res.json({ success: false, message: 'Authentication failed. User not found.' });
                    }
                });
            }
            else{
                return json({ success: false, message: 'token is invalid' });
            }
        });
    });

router.route('/updateProfile')
    .post(function(req, res, next){
        var token = req.body.token || req.query.token || req.headers['x-access-token'];

        // decode token
        tokenVerify(token, function(result){
            if(result == 'valid'){
                userVerification(req.body.idname, function(rst){
                    var user = rst;

                    if(user != null)
                    {
                        user.password = req.body.newProfile.password;
                        user.phone_number = req.body.newProfile.phone;
                        
                        //image save....
                        var imageData = req.body.newProfile.avatarData;

                        if(imageData != undefined || imageData != '')
                        {
                            var data = imageData.replace(/^data:image\/\w+;base64,/, "");
                            var buf = new Buffer(data, 'base64');

                            var sv_url = './public/avatars/' + user._id;
                            fs.writeFile(sv_url ,buf , function(err) {
                                if(err) {
                                    return console.log(err);
                                }

                                console.log("The file was saved!");
                            }); 
                        
                            user.imageUrl = config.baseURL + user._id; // image url
                        }

                        var doc = { 
                            password: user.password,
                            exam_date : user.exam_date,
                            location : user.location,
                            age : user.age,
                            occupation : user.occupation,
                            education : user.education,
                            imageUrl : user.imageUrl
                         };
                         user.update(doc, function(err,raw){
                                if(err)
                                {
                                    return res.json({ success: false });
                                }
                                else{
                                    return res.json({ success: true });
                                }
                         });
                    }

                    else
                    {
                        return res.json({ success: false, message: 'User not existed' });
                    }
                });
            }
            else{
                return json({ success: false, message: 'token is invalid' });
            }
        });
    });
    */
router.route('/sendSMS')
    .post(function(req, res, next){
        var email = req.body.email;
        var nodemailer = require('nodemailer');

        var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: config.mailCredential.mail, // Your email id
                pass: config.mailCredential.password // Your password
            }
        });
        var randomFour = randomFourDigit();
        var text = 'email verify code : ' + randomFour;

        var mailOptions = {
            from: 'james90727@gmail.com', // sender address
            to: email, // list of receivers
            subject: 'MarvelApp Email verification', // Subject line
            text: text //, // plaintext body
            // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
        };

        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
                return res.json({success : false});
            }else{
                console.log('Message sent: ' + info.response);
                return res.json({success: true, content : randomFour});
            };
        });
    });
function randomFourDigit(){
    var val = Math.floor(1000 + Math.random() * 9000);
    console.log(val);
    return val;
}
router.route('/sendSMSToPhone')
    .post(function(req, res, next){
        var accountSid = config.twiliosid;
        var authToken = config.authtoken; 
        console.log(accountSid);
        console.log(authToken);
        //require the Twilio module and create a REST client 
        var client = require('twilio')(accountSid, authToken); 
        var randomFour = randomFourDigit();
        client.messages
            .create({
                to: '+971551536894',
                from: '+17608527111',
                body: "Marvel App : Phone Verification Code : " + randomFour,
            }).then((message) => {
                console.log(message.sid);
                if(message.sid != undefined || message.sid != '')
                    return res.json({success : true, content : randomFour});
                else
                    return res.json({success : false});
            });
    });
router.route('/getAllUsers')
    .post(function(req, res, next){
        var userList = {};
        userInfo.find({}, function (err, users) {
            users.forEach(function(usr) {
                userList.push(usr.username);
            }, this);
            return res.json(userList);
        });
    });
    
router.route('/isexisteduser')
    .post(function(req, res, next){
        userVerification(req.body.idname, req.body.email, req.body.phone, function(result){
                if(result == null){
                    return res.json({isexisted : false});
                }
                else{
                    console.log(req.body);
                    console.log(result);
                    return res.json({isexisted : true});
                }
            }
        );
    });
    
module.exports = router;