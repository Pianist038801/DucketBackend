var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var jwt = require('jsonwebtoken');
var user = require('./models/userschema');
var config = require('./config/appconfig');
var cors = require('cors'); //hosting to hosting communication service
var app = express();

var usermanage = require('./routes/user');
var home = require('./routes/index');
var friendManage = require('./routes/friend');

var db = require('./models/database');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// cors problem will be solved here
app.use(cors()); //important

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(logger('dev'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

//route...
app.use('/user', usermanage);
app.use('/', home);
app.use('/friend', friendManage);

//facebook login
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
