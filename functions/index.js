const functions = require('firebase-functions')
const express = require('express')
const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream
} = require('./handlers/screams')
const {
  signupUser,
  loginUser,
  addUserDetails,
  uploadImage,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationRead
} = require('./handlers/users')
const { FBAuth } = require('./middlewares/FBAuth')
const { db } = require('./utils/firebase')

const app = express()

// Screams Routes
app.get('/screams', getAllScreams)
app.post('/scream', FBAuth, postOneScream)
app.delete('/scream/:screamId', FBAuth, deleteScream)
app.get('/scream/:screamId', getScream)
app.post('/scream/:screamId/comment', FBAuth, commentOnScream)
app.get('/scream/:screamId/like', FBAuth, likeScream)
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream)

// Users routes
app.post('/signup', signupUser)
app.post('/login', loginUser)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)
app.post('/user/image', FBAuth, uploadImage)
app.get('/user/:handle', getUserDetails)
app.post('/notifications', FBAuth, markNotificationRead)

exports.api = functions.region('europe-west1').https.onRequest(app)

exports.createNotificationOnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onCreate(snapshot => {
    return db
      .collection('screams')
      .doc(snapshot.data().screamId)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.collection('notifications').doc(snapshot.id).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          })
        } else {
          console.log('Do not exists')
        }
      })
      .catch(err => console.error(err.message))
  })

exports.createNotificationOnComment = functions
  .region('europe-west1')
  .firestore.document('comments/{id}')
  .onCreate(snapshot => {
    return db
      .collection('screams')
      .doc(snapshot.data().screamId)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.collection('notifications').doc(snapshot.id).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            screamId: doc.id
          })
        }
      })
      .catch(err => console.error(err.message))
  })

exports.deleteNotificationOnUnlike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onDelete(snapshot => {
    return db
      .collection('notifications')
      .doc(snapshot.id)
      .delete()
      .catch(err => console.error(err.message))
  })
