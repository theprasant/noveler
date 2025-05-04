import express from 'express';
// import { requiresAuth } from 'express-openid-connect';
import expressOpenIdConnect from 'express-openid-connect';
const { requiresAuth } = expressOpenIdConnect;

import admin from "../database/admin.js";
import { getFirestore } from 'firebase-admin/firestore';
const firestore = getFirestore();

const projectrouter = express.Router();
const usersRef = firestore.collection('users');

projectrouter.get('/:projectId', requiresAuth(), async function (req, res, next) {
  let projectDetailsRef = usersRef.doc(req.oidc.user.sub).collection('projects').doc(req.params.projectId);
  let projectDetails = await projectDetailsRef.get();
  let projectData = projectDetails.data() || {};
  if (!projectDetails.exists || !projectData) {
    return res.render('notfound', {
      title: 'Project Not Found',
      error: {
        message: 'Project not found',
        status: 404
      }
    });
  }

  projectData.description = formatDescription(projectData.description);
  //console.log('projectData.description: ', projectData.description);

  res.render('project', {
    title: 'Project',
    user: req.oidc.user,
    projectId: req.params.projectId,
    userId: req.oidc.user.sub,
    projectData: projectData
  });
});

projectrouter.get('/:projectId/new', requiresAuth(), async function (req, res, next) {
  //For new character creation
  //console.log('req.path: ', req.path);
  const projectId = req.params.projectId;
  // Check if the project exists in db
  let projectDetailsRef = usersRef.doc(req.oidc.user.sub).collection('projects').doc(projectId);
  let projectDetails = await projectDetailsRef.get();
  if (!projectDetails.exists) {
    return res.render('notfound', {
      title: 'Project Not Found',
      error: {
        message: 'Project not found',
        status: 404
      }
    });
  }
  res.render('newcharacter', {
    title: 'New Character',
    projectId: projectId,
    user: req.oidc.user,
    postReqPath: `/project/${projectId}/new`
  });
});

projectrouter.post('/:projectId/new', requiresAuth(), async function (req, res, next) {
  // For new character creation
  const projectId = req.params.projectId;
  let { characterName, characterDescription } = req.body;
  characterDescription = characterDescription.replace(/(\r\n|\n|\r)/gm, '\\n');
  // characterDescription = escapeHtml(characterDescription);
  // characterName = escapeHtml(characterName);
  const userId = req.oidc.user.sub;
  let charactersRef = usersRef.doc(userId).collection('projects').doc(projectId).collection('characters');
  let characterRef = await charactersRef.add({
    name: characterName,
    description: characterDescription,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  let characterId = characterRef.id;
  //console.log('Character ID:', characterId);

  let projectRef = usersRef.doc(userId).collection('projects').doc(projectId);
  await projectRef.set({
    charactersinfo: {
      [characterId]: characterName
    }
  }, { merge: true });


  //console.log('Updated project reference:', projectRef.id);

  res.redirect(`/project/${projectId}/character/${characterId}`);
});

function escapeHtml (unsafe) {
  return unsafe
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

function formatDescription (desc) {
  const escaped = escapeHtml(desc);
  return escaped.replace(/\\n/g, "<br>");
};



export default projectrouter;