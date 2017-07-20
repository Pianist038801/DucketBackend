var mongo = require('mongoose');
var config = require('../config/appconfig');

mongo.connect(config.dbURL);

var db = mongo.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));