import express from 'express';
// import { requiresAuth } from 'express-openid-connect';
import expressOpenIdConnect from 'express-openid-connect';
const { requiresAuth } = expressOpenIdConnect;

import admin from "../database/admin.js";
import { getFirestore } from 'firebase-admin/firestore';
const firestore = getFirestore();

const router = express.Router();
const usersRef = firestore.collection('users');

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Noveler',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

router.get('/profile', requiresAuth(), function (req, res, next) {
  res.render('profile', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Profile'
  });
});

router.get('/about', function (req, res, next) {
  res.render('about', {
    title: 'About',
    isAuthenticated: req.oidc.isAuthenticated()
  });
}
);

router.get('/privacy-policy', function (req, res, next) {
  res.render('privacy', {
    title: 'Privacy Policy',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

router.get('/terms', function (req, res, next) {
  res.render('terms', {
    title: 'Terms of Service',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

export default router;
