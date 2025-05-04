import express from 'express';
// import { requiresAuth } from 'express-openid-connect';
import expressOpenIdConnect from 'express-openid-connect';
const { requiresAuth } = expressOpenIdConnect;

import admin from "../database/admin.js";
import { getFirestore } from 'firebase-admin/firestore';
const firestore = getFirestore();

const projectsrouter = express.Router();
const usersRef = firestore.collection('users');

projectsrouter.get('/', requiresAuth(), async function (req, res, next) {
  // Check if the user exists in db and if they have projects
  let userprojectsinfo = {};
  const userId = req.oidc.user.sub;
  const userDoc = await usersRef.doc(userId).get();

  if (userDoc.exists) {
    const userData = userDoc.data();
    if (userData.projectsinfo && Object.keys(userData.projectsinfo).length > 0) {
      userprojectsinfo = userData.projectsinfo;
    }
  }

  res.render('projects', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    userProjectsInfo: JSON.stringify(userprojectsinfo, null, 2),
    title: 'Projects'
  });
});

projectsrouter.get('/new', requiresAuth(), function (req, res, next) {
  res.render('newproject', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'New Project'
  });
});

projectsrouter.post('/new', requiresAuth(), async function (req, res, next) {
  // const { projectName, projectDescription } = req.body;
  //console.log('req.body: ', req.body);
  let { projectName, projectDescription } = req.body;
  projectDescription = projectDescription.replace(/(\r\n|\n|\r)/gm, '\\n');
  projectDescription = escapeHtml(projectDescription);
  projectName = escapeHtml(projectName);
  //console.log('Processed Project Description:', projectDescription);
  const userId = req.oidc.user.sub;
  let projectsRef = usersRef.doc(userId).collection('projects');
  let projectRef = await projectsRef.add({
    name: projectName,
    description: projectDescription,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  let projectId = projectRef.id;
  //console.log('Project ID:', projectId);

  //add project metadata to user document
  let userRef = usersRef.doc(req.oidc.user.sub);
  await userRef.set({
    projectsinfo: {
      [projectId]: projectName
    }
  }, { merge: true });

  res.redirect('/project/' + projectId);
});

function escapeHtml (unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};


export default projectsrouter;
