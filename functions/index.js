const functions = require('firebase-functions')
const express = require('express')
const { getAllScreams, postOneScream } = require('./handlers/screams')
const { signupUser, loginUser, addUserDetails, uploadImage, getAuthenticatedUser } = require('./handlers/users')
const { FBAuth } = require('./middlewares/FBAuth')

const app = express()

// Screams Routes
app.get('/screams', getAllScreams)
app.post('/scream', FBAuth, postOneScream)

// Users routes
app.post('/signup', signupUser)
app.post('/login', loginUser)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)
app.post('/user/image', FBAuth, uploadImage)

exports.api = functions.region('europe-west1').https.onRequest(app)
