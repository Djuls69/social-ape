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
const { db } = require('./utils/admin')

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
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return db.collection('notifications').doc(snapshot.id).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          })
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
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
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

exports.onUserImageChange = functions
  .region('europe-west1')
  .firestore.document('users/{userId}')
  .onUpdate(change => {
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      const batch = db.batch()
      return db
        .collection('screams')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then(data => {
          data.forEach(doc => {
            const scream = db.collection('screams').doc(doc.id)
            batch.update(scream, { userImage: change.after.data().imageUrl })
          })
          return db.collection('comments').where('userHandle', '==', change.before.data().handle).get()
        })
        .then(data => {
          data.forEach(doc => {
            const comment = db.collection('comments').doc(doc.id)
            batch.update(comment, { userImage: change.after.data().imageUrl })
          })
          return batch.commit()
        })
        .catch(err => console.error(err.message))
    } else {
      return true
    }
  })

exports.onScreamDelete = functions
  .region('europe-west1')
  .firestore.document('screams/{screamId}')
  .onDelete((snapshot, context) => {
    const screamId = context.params.screamId
    const batch = db.batch()
    return db
      .collection('likes')
      .where('screamId', '==', screamId)
      .get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.collection('likes').doc(doc.id))
        })
        return db.collection('comments').where('screamId', '==', screamId).get()
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.collection('comments').doc(doc.id))
        })
        return db.collection('notifications').where('screamId', '==', screamId).get()
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.collection('notifications').doc(doc.id))
        })
        return batch.commit()
      })
      .catch(err => console.error(err.message))
  })
