const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const nocache = require('nocache');
const session = require('express-session');
const flash = require('connect-flash');
const createError = require('http-errors');

const connectDB = require('./config/db');
const dotenv = require('dotenv').config();

const usersRouter = require('./routes/users');
const adminsRouter = require('./routes/admins');
const { isAuthenticated } = require('./middleware/auth');
const cartCount=require('./middleware/cartCount')
const wishlistCount=require('./middleware/wishlistCount')


const app = express();

connectDB();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(expressLayouts);
app.set('layout', 'layouts/userLayout.ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(nocache());

app.use(
  session({
    secret: process.env.SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
  })
);


app.use((req, res, next) => {
  res.locals.user = req.session.user || req.user; 
  next();
});

app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});


app.use(isAuthenticated);
app.use(cartCount)
app.use(wishlistCount)

app.use('/', usersRouter);
app.use('/admin', adminsRouter);


app.use(function(req, res, next) {
  next(createError(404));
});


app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
