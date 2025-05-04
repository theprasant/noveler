import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import logger from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import router from './routes/index.js';
import projectsrouter from './routes/projects.js';
import projectrouter from './routes/project.js';
import characterrouter from './routes/character.js';
import { auth } from 'express-openid-connect';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// import admin from "./database/admin.js";
// import { getFirestore } from 'firebase-admin/firestore';
// const firestore = getFirestore();

dotenv.load();

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const config = {
  authRequired: false,
  auth0Logout: true
};

const port = process.env.PORT || 3000;
if (!config.baseURL && !process.env.BASE_URL && process.env.PORT && process.env.NODE_ENV !== 'production') {
  config.baseURL = `http://localhost:${port}`;
}

app.use(auth(config));

// Middleware to make the `user` object available for all views
app.use(function (req, res, next) {
  res.locals.user = req.oidc.user;
  next();
});

// add public folder to serve static files
app.use(express.static('public'));

app.use('/', router);
app.use('/projects', projectsrouter);
app.use('/project', projectrouter);
app.use('/project', characterrouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handlers
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: process.env.NODE_ENV !== 'production' ? err : {}
  });
});

http.createServer(app)
  .listen(port, () => {
    //console.log(`Listening on ${config.baseURL}`);
  });
