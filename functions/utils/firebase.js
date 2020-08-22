const firebase = require('firebase/app')
require('firebase/auth')
require('firebase/firestore')
const configApp = require('../private/configApp')

firebase.initializeApp(configApp)

const auth = firebase.auth()
const db = firebase.firestore()

module.exports = { auth, db }
