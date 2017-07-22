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
}));

function getGeneralUser(userName, frList, reqList, requireList, done){
    var userList = {};
    var generalUser = [];
    userInfo.find({}, function (err, users) {
        userList = users;
        for(var i = 0; i < userList.length; i ++ ){
            if(userList[i].username != userName && frList.indexOf(userList[i].username) == -1 && reqList.indexOf(userList[i].username) == -1 && requireList.indexOf(userList[i].username) == -1){
                generalUser.push(userList[i].username);
            }
        }
        return done(generalUser);
    });
}

function getGeneralUserForSearch(userName, frList, reqList, done){
    var userList = {};
    var generalUser = [];
    userInfo.find({}, function (err, users) {
        userList = users;
        for(var i = 0; i < userList.length; i ++ ){
            if(userList[i].username != userName && frList.indexOf(userList[i].username) == -1 && reqList.indexOf(userList[i].username) == -1){
                generalUser.push(userList[i].username);
            }
        }
        return done(generalUser);
    });
}

router.route('/getmyfriendinfo')
    .post(function(req, res) {
        var userDB = new userInfo({
            username : req.body.idname
        });
        userDB.FindByUserName(function(err, users){
            if(err || !users || users.length == 0){
                return res.json({result : 'no result'});
            }
            else{
                var friendList = users[0].friends.split(',');
                var requestfriendList = users[0].requestfriendlist.split(',');
                var requiredfriendList = users[0].requiredfriendlist.split(',');

                if(friendList.length >= 1){
                    friendList.splice(friendList.length-1, 1);
                }
                if(requestfriendList.length >= 1){
                    requestfriendList.splice(requestfriendList.length-1, 1);
                }
                if(requiredfriendList.length >= 1){
                    requiredfriendList.splice(requiredfriendList.length-1, 1);
                }

                getGeneralUser(req.body.idname,friendList, requestfriendList, requiredfriendList, function(gnUsers){
                    console.log(gnUsers);
                    console.log(friendList);
                    return res.json({result : 'ok', friends : friendList, requestfriends : requestfriendList, requiredfriends : requiredfriendList, generalUser : gnUsers});
                });
                
            }
        });
    });
function isUserRequired(listString, req){
    if(listString.indexOf(req) == -1)
        return false;
    else
        return true;
}
router.route('/searchuser')
    .post(function(req, res) {
        var user = req.body.username;
        var str = req.body.search;

        var userDB = new userInfo({
            username : user
        });

        userDB.FindByUserName(function(err, users){
            if(err || !users || users.length == 0){
                return res.json({result : 'no result'});
            }
            else{
                var friendList = users[0].friends.split(',');
                var requestfriendList = users[0].requestfriendlist.split(',');
                var requiredfriendList = users[0].requiredfriendlist.split(',');

                if(friendList.length >= 1){
                    friendList.splice(friendList.length-1, 1);
                }
                if(requestfriendList.length >= 1){
                    requestfriendList.splice(requestfriendList.length-1, 1);
                }
                if(requiredfriendList.length >= 1){
                    requiredfriendList.splice(requiredfriendList.length-1, 1);
                }

                getGeneralUserForSearch(user,friendList, requestfriendList, function(gnUsers){
                    var filteredUsers = [];

                    for(var i = 0; i < gnUsers.length ;i ++ ){
                        if(gnUsers[i].indexOf(str) !== -1){
                            filteredUsers.push({
                                user : gnUsers[i],
                                isSent : isUserRequired(requiredfriendList,gnUsers[i]),
                            });
                        }
                    }
                    
                    return res.json({result : 'ok', gnUsers : filteredUsers});
                });
            }
        });
    });
router.route('/friendRequest')
    .post(function(req, res) {
        var from = req.body.from;
        var friend = req.body.requiredFriend;

        getUser(friend, function(user){
            console.log(user);
            sendPushNotification(user.deviceToken, from + ' has just sent you friend Request!').then( resp => {
                if(resp.errors)
                {
                    console.log('error occured');
                    return res.json({
                        result : 'canceled',
                        message : 'Can not send friend request!!',
                    });
                }
                else{
                    console.log('friend request sent!');
                    var doc = {
                         _id: user._id,
                        username: user.username,
                        password: user.password,
                        email: user.email,
                        phone :user.phone,
                        friends : user.friends,
                        requestfriendlist : user.requestfriendlist + from + ',',
                        requiredfriendlist : user.requiredfriendlist,
                        isLoggedIn : user.isLoggedIn,
                        deviceToken : user.deviceToken,
                        osType : user.osType,
                    };
                    user.update(doc, function(err,raw){
                        getUser(from, function(fromuser){
                            var doc1 = {
                                _id: fromuser._id,
                                username: fromuser.username,
                                password: fromuser.password,
                                email: fromuser.email,
                                phone :fromuser.phone,
                                friends : fromuser.friends,
                                requestfriendlist : fromuser.requestfriendlist,
                                requiredfriendlist : fromuser.requiredfriendlist + friend + ',',
                                isLoggedIn : fromuser.isLoggedIn,
                                deviceToken : fromuser.deviceToken,
                                osType : fromuser.osType,
                            }
                            fromuser.update(doc1, function(err1, raw1){
                                if(!err1)
                                {
                                    return res.json({
                                        result : 'ok',
                                        message : 'Successfully sent!',
                                    });
                                }
                            });
                        });
                    });
                }
            });
        });

    });

function removeItemFromString(stringArray, item){
    var friendList = stringArray.split(',');
    if(friendList.length >= 1){
        friendList.splice(friendList.length - 1, 1);
        friendList.splice(friendList.indexOf(item) - 1, 1);
    }
    return friendList;
}

router.route('/acceptrequest')
    .post(function(req, res){
        var from = req.body.from;
        var friend = req.body.requestfriend;

        getUser(from, function(user){
            var newRequest = removeItemFromString(user.requestfriendlist, friend);
            
            var doc = {
                _id: user._id,
                username: user.username,
                password: user.password,
                email: user.email,
                phone :user.phone,
                friends : user.friends + friend + ',',
                requiredfriendlist : user.requiredfriendlist,
                requestfriendlist : newRequest,
                isLoggedIn : user.isLoggedIn,
                deviceToken : user.deviceToken,
                osType : user.osType,
            }
            user.update(doc,function(err,raw){
                if(err)
                {
                    return res.json({ result: 'poor' });
                }
                else{
                    getUser(friend, function(user1){
                        sendPushNotification(user1.deviceToken, from + ' has accepted your request!').then(resp => {
                            if(resp.errors){
                                console.log('error occured');
                                return res.json({
                                    result : 'canceled',
                                    message : 'Can not send friend request!!',
                                });
                            }
                            else{
                                var newRequire = removeItemFromString(user1.requiredfriendlist, from);
                                var doc = {
                                    _id : user1._id,
                                    username: user1.username,
                                    password: user1.password,
                                    email: user1.email,
                                    phone :user1.phone,
                                    friends : user1.friends + from + ',',
                                    requiredfriendlist : newRequire,
                                    requestfriendlist : user1.requestfriendlist,
                                    isLoggedIn : user1.isLoggedIn,
                                    deviceToken : user1.deviceToken,
                                    osType : user1.osType,
                                };
                                user1.update(doc, function(err, raw){
                                    if(!err){
                                        return res.json({ result: 'ok' });
                                    }
                                });
                            }
                        });
                    });
                }
            });
        });
    });

router.route('/declinerequest')
    .post(function(req, res){
        var from = req.body.from;
        var requestFriend = req.body.requestfriend;

        getUser(from, function(user){
            var newRequest = removeItemFromString(user.requestfriendlist, requestFriend);
            
            var doc = {
                _id: user._id,
                username: user.username,
                password: user.password,
                email: user.email,
                phone :user.phone,
                friends : user.friends ,
                requiredfriendlist : user.requiredfriendlist,
                requestfriendlist : newRequest,
                isLoggedIn : user.isLoggedIn,
                deviceToken : user.deviceToken,
                osType : user.osType,
            }
            user.update(doc,function(err,raw){
                if(!err){
                    getUser(requestFriend, function(user1){
                        sendPushNotification(user1.deviceToken, from + ' has declined your request!').then(resp => {
                            if(resp.errors){
                                console.log('error occured');
                                return res.json({
                                    result : 'canceled',
                                    message : 'Can not send friend request!!',
                                });
                            }
                            else{
                                var newRequire = removeItemFromString(user1.requiredfriendlist, from);
                                
                                var doc = {
                                    _id : user1._id,
                                    username: user1.username,
                                    password: user1.password,
                                    email: user1.email,
                                    phone :user1.phone,
                                    friends : user1.friends ,
                                    requiredfriendlist : newRequire,
                                    requestfriendlist : user1.requestfriendlist,
                                    isLoggedIn : user1.isLoggedIn,
                                    deviceToken : user1.deviceToken,
                                    osType : user1.osType,
                                };
                                user1.update(doc, function(err, raw){
                                    if(!err){
                                        return res.json({ result: 'ok' });
                                    }
                                });
                            }
                        });
                    });
                }
            });
        });
    });

function getUser(username, done){
    var userDB = userInfo({
        username : username
    });
    userDB.FindByUserName(function(err, users){
        if(!err)
            return done(users[0]);
        else
            return done(null);
    });
}

function sendPushNotification(des_token, msg){
    var oneSignal = require('onesignal')(config.onesignal_apikey, config.onesignal_appid, true);
    
    var deviceIDs = new Array(des_token);

    return oneSignal.createNotification(msg, {
        Title : 'Hello world',
        Badges : 'Increment by 1',
    }, deviceIDs);
}

module.exports = router;