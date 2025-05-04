import express from 'express';
// import { requiresAuth } from 'express-openid-connect';
import expressOpenIdConnect from 'express-openid-connect';
const { requiresAuth } = expressOpenIdConnect;

import admin from "../database/admin.js";
import { getFirestore } from 'firebase-admin/firestore';
const firestore = getFirestore();

const characterrouter = express.Router();
const usersRef = firestore.collection('users');

characterrouter.get('/:projectId/character/:characterId', requiresAuth(), async function (req, res, next) {
    let projectDetailsRef = usersRef.doc(req.oidc.user.sub).collection('projects').doc(req.params.projectId);
    let characterDetailsRef = projectDetailsRef.collection('characters').doc(req.params.characterId);

    let projectDetails = await projectDetailsRef.get();
    let characterDetails = await characterDetailsRef.get();
    let projectData = projectDetails.data();
    let characterData = characterDetails.data();
    
    if (!characterDetails.exists || !characterData || !projectDetails.exists || !projectData) {
        //console.log('Project or character not found');
        return res.render('notfound', {
            title: 'Character Not Found',
            error: {
                message: 'Character not found',
                status: 404
            }
        });
    }

    projectData = projectData || {};
    projectData.name = projectData.name || 'Unnamed Project';

    characterData = characterData || {};
    characterData.name = characterData.name ? formatDescription(characterData.name, true) : 'Unnamed Character';
    characterData.description = characterData.description ? formatDescription(characterData.description, true) : 'No description available';
    //console.log('characterData.description: ', characterData.description);
    characterData.versions = characterData.versions || {};
    //sort according to date newest to oldest
    const sortedVersions = Object.entries(characterData.versions).sort((a, b) => {
        const dateA = new Date(a[1]._seconds * 1000 + a[1]._nanoseconds / 1000000);
        const dateB = new Date(b[1]._seconds * 1000 + b[1]._nanoseconds / 1000000);
        return dateB - dateA; // Sort in descending order
    });
    
    characterData.versions = Object.fromEntries(sortedVersions);
    for (const versionId in characterData.versions) {
        characterData.versions[versionId] = formatFullDateTime(characterData.versions[versionId]);
    }

    res.render('character', {
        title: characterData.name || 'Character',
        user: req.oidc.user,
        projectId: req.params.projectId,
        characterId: req.params.characterId,
        userId: req.oidc.user.sub,
        projectData: projectData,
        characterData: characterData,
    });
});

characterrouter.get('/:projectId/character/:characterId/v/:versionId', requiresAuth(), async function (req, res, next) {
    let projectDetailsRef = usersRef.doc(req.oidc.user.sub).collection('projects').doc(req.params.projectId);
    let characterDetailsRef = projectDetailsRef.collection('characters').doc(req.params.characterId).collection('history').doc(req.params.versionId);

    let projectDetails = await projectDetailsRef.get();
    let characterDetails = await characterDetailsRef.get();
    let projectData = projectDetails.data();
    let characterData = characterDetails.data();
    if (!characterDetails.exists || !characterData || !projectDetails.exists || !projectData) {
        //console.log('Project or character not found');
        return res.render('notfound', {
            title: 'Character Not Found',
            error: {
                message: 'Character not found',
                status: 404
            }
        });
    }

    let rawCharacterData = { ...characterData };
    delete rawCharacterData.versions;
    for(const key in rawCharacterData) {
        if (rawCharacterData[key] && typeof rawCharacterData[key] === 'string') {
            rawCharacterData[key] = escapeHtml(rawCharacterData[key]);
        }
    }

    projectData = projectData || {};
    projectData.name = projectData.name || 'Unnamed Project';

    characterData = characterData || {};
    characterData.name = characterData.name ? formatDescription(characterData.name, true) : 'Unnamed Character';
    characterData.description = characterData.description ? formatDescription(characterData.description, true) : 'No description available';
    //console.log('characterData.description: ', characterData.description);
    characterData.versions = characterData.versions || {};
    for (const versionId in characterData.versions) {
        characterData.versions[versionId] = formatDate(characterData.versions[versionId]);
    }
    //console.log('projectData: ', projectData);
    res.render('character-v', {
        title: characterData.name || 'Character',
        user: req.oidc.user,
        projectId: req.params.projectId,
        characterId: req.params.characterId,
        versionId: req.params.versionId,
        userId: req.oidc.user.sub,
        projectData: projectData,
        characterData: characterData,
        rawCharacterData: rawCharacterData,
    });

});

characterrouter.get('/:projectId/character/:characterId/edit', requiresAuth(), async function (req, res, next) {
    let projectDetailsRef = usersRef.doc(req.oidc.user.sub).collection('projects').doc(req.params.projectId);
    let characterDetailsRef = projectDetailsRef.collection('characters').doc(req.params.characterId);

    let projectDetails = await projectDetailsRef.get();
    let characterDetails = await characterDetailsRef.get();
    let projectData = projectDetails.data();
    let characterData = characterDetails.data();
    if (!characterDetails.exists || !characterData || !projectDetails.exists || !projectData) {
        //console.log('Project or character not found');
        return res.render('notfound', {
            title: 'Character Not Found',
            error: {
                message: 'Character not found',
                status: 404
            }
        });
    }

    projectData = projectData || {};
    projectData.name = projectData.name || 'Unnamed Project';

    characterData = characterData || {};
    characterData.name = characterData.name || 'Unnamed Character';
    characterData.description = characterData.description || 'No description available';
    // characterData.description = characterData.description ? formatDescription(characterData.description) : 'No description available';
    // characterData.name = unformatDescription(characterData.name);
    // characterData.description = unformatDescription(characterData.description);
    characterData.name = escapeHtml(characterData.name).replace(/\\n/g, "\n");
    characterData.description = escapeHtml(characterData.description).replace(/\\n/g, "\n");
    //console.log('characterData.name: ', characterData.name);
    //console.log('characterData.description: ', characterData.description);

    res.render('editcharacter', {
        title: `Edit ${characterData.name}`,
        user: req.oidc.user,
        projectId: req.params.projectId,
        characterId: req.params.characterId,
        userId: req.oidc.user.sub,
        projectData: projectData,
        // characterData: JSON.stringify(characterData),
        characterData: characterData,
        postReqPath: `/project/${req.params.projectId}/character/${req.params.characterId}/edit`,
    });
});

characterrouter.post('/:projectId/character/:characterId/edit', requiresAuth(), async function (req, res, next) {
    let projectDetailsRef = usersRef.doc(req.oidc.user.sub).collection('projects').doc(req.params.projectId);
    let characterDetailsRef = projectDetailsRef.collection('characters').doc(req.params.characterId);
    let characterHistoryRef = projectDetailsRef.collection('characters').doc(req.params.characterId).collection('history');

    let projectDetails = await projectDetailsRef.get();
    let characterDetails = await characterDetailsRef.get();
    let projectData = projectDetails.data();
    let characterData = characterDetails.data();
    if (!characterDetails.exists || !characterData || !projectDetails.exists || !projectData) {
        //console.log('Project or character not found');
        return res.render('notfound', {
            title: 'Character Not Found',
            error: {
                message: 'Character not found',
                status: 404
            }
        });
    }

    const oldCharacterData = { ...characterData };
    delete oldCharacterData.versions;

    let { characterName, characterDescription } = req.body;
    characterDescription = characterDescription.replace(/(\r\n|\n|\r)/gm, '\\n');
    characterName = characterName.replace(/(\r\n|\n|\r)/gm, '\\n');
    //console.log('(edit): characterName: ', characterName);
    //console.log('(edit): characterDescription: ', characterDescription);

    let newUpdatedAt = new Date();
   

    let newHistoryRef = await characterHistoryRef.add(oldCharacterData);
    let versionId = newHistoryRef.id;

    await characterDetailsRef.set({
        name: characterName,
        description: characterDescription,
        updatedAt: newUpdatedAt,
        versions: {
            [versionId]: newUpdatedAt
        }
    }, { merge: true });

    await projectDetailsRef.set({
        charactersinfo: {
            [req.params.characterId]: characterName
        }
    }, { merge: true });

    res.redirect(`/project/${req.params.projectId}/character/${req.params.characterId}`);
    // res.status(200).json({ message: 'Character updated successfully!' });
});

characterrouter.post('/:projectId/character/:characterId/revert', requiresAuth(), async function (req, res, next) {
    let projectDetailsRef = usersRef.doc(req.oidc.user.sub).collection('projects').doc(req.params.projectId);
    let characterDetailsRef = projectDetailsRef.collection('characters').doc(req.params.characterId);
    let characterHistoryRef = projectDetailsRef.collection('characters').doc(req.params.characterId).collection('history');

    let projectDetails = await projectDetailsRef.get();
    let characterDetails = await characterDetailsRef.get();
    let projectData = projectDetails.data();
    let characterData = characterDetails.data();
    if (!characterDetails.exists || !characterData || !projectDetails.exists || !projectData) {
        //console.log('Project or character not found');
        return res.render('notfound', {
            title: 'Character Not Found',
            error: {
                message: 'Character not found',
                status: 404
            }
        });
    }

    const oldCharacterData = { ...characterData };
    delete oldCharacterData.versions;

    let { characterName, characterDescription } = req.body;
    characterDescription = characterDescription.replace(/(\r\n|\n|\r)/gm, '\\n');
    characterName = characterName.replace(/(\r\n|\n|\r)/gm, '\\n');
    //console.log('(edit 1): characterName: ', characterName);
    //console.log('(edit 1): characterDescription: ', characterDescription);
    characterDescription = unescapeHtml(characterDescription);
    characterName = unescapeHtml(characterName);
    
    //console.log('(edit 2): characterName: ', characterName);
    //console.log('(edit 2): characterDescription: ', characterDescription);

    let newUpdatedAt = new Date();
   

    let newHistoryRef = await characterHistoryRef.add(oldCharacterData);
    let versionId = newHistoryRef.id;

    await characterDetailsRef.set({
        name: characterName,
        description: characterDescription,
        updatedAt: newUpdatedAt,
        versions: {
            [versionId]: newUpdatedAt
        }
    }, { merge: true });

    await projectDetailsRef.set({
        charactersinfo: {
            [req.params.characterId]: characterName
        }
    }, { merge: true });

    // res.redirect(`/project/${req.params.projectId}/character/${req.params.characterId}`);
    res.status(200).json({ message: 'Character updated successfully!', success: true });
});

characterrouter.delete('/:projectId/character/:characterId/delete', requiresAuth(), async function (req, res, next) {
    let projectDetailsRef = usersRef.doc(req.oidc.user.sub).collection('projects').doc(req.params.projectId);
    let characterDetailsRef = projectDetailsRef.collection('characters').doc(req.params.characterId);

    // let projectDetails = await projectDetailsRef.get();
    // let characterDetails = await characterDetailsRef.get();
    // let projectData = projectDetails.data();
    // let characterData = characterDetails.data();
    // if (!characterDetails.exists || !characterData || !projectDetails.exists || !projectData) {
    //     //console.log('Project or character not found');
    //     return res.render('notfound', {
    //         title: 'Character Not Found',
    //         error: {
    //             message: 'Character not found',
    //             status: 404
    //         }
    //     });
    // }

    await characterDetailsRef.delete();
    await projectDetailsRef.set({
        charactersinfo: {
            [req.params.characterId]: admin.firestore.FieldValue.delete()
        }
    }, { merge: true });

    res.status(200).json({ message: 'Character deleted!' });
});

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

function unescapeHtml(escaped) {
    return escaped
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#039;/g, "'");
}

function formatDescription(desc, escape) {
    const escaped = escape ? escapeHtml(desc) : desc;
    return escaped.replace(/\\n|\n/g, "<br>");
};

function formatDate(dateString) {
    const date = new Date(dateString._seconds * 1000 + dateString._nanoseconds / 1000000);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

function formatFullDateTime(dateString) {
    const date = new Date(dateString._seconds * 1000 + dateString._nanoseconds / 1000000);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleString(undefined, options);
}


export default characterrouter;