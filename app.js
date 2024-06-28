require('dotenv').config()
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const nodemailer = require('nodemailer')
const flash=require('connect-flash')
const nocache=require('nocache')
const session=require('express-session')




const connectDB = require('./config/db');

const usersRouter = require('./routes/users');

const adminsRouter = require('./routes/admins');
const { isAuthenticated } = require('./middleware/auth');





const app = express();

connectDB();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(expressLayouts);
app.set('layout', 'layouts/userLayout.ejs')
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(nocache())
app.use(
  session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false
  }));
  app.use(isAuthenticated);
 
  


app.use(flash())
app.use((req,res,next)=>{
  res.locals.success=req.flash('success')
  res.locals.error=req.flash('error')
  next()
})

app.use('/', usersRouter);
app.use('/admin', adminsRouter);





// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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