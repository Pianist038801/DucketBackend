var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'), //mongo connection
    bodyParser = require('body-parser'), //parses information from POST
    methodOverride = require('method-override'); //used to manipulate POST
var userInfo = require('../models/userschema');
var ObjectID = require('mongodb').ObjectID;

router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
}))

router.route('/')
	.get(function(req, res, next) {
		res.format({
              //HTML response will render the index.jade file in the views/blobs folder. We are also setting "blobs" to be an accessible variable in our jade view
            html: function(){
                res.render('index', {
                      title: 'Welcome to our Marvel App!',
                  });
            },
            //JSON response will show all blobs in JSON format
            json: function(){
                res.json(users);
            }
        });
	});


module.exports = router;