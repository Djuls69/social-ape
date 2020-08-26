const firebase = require('firebase/app')
require('firebase/auth')
const configApp = require('../private/configApp')

firebase.initializeApp(configApp)

const auth = firebase.auth()

module.exports = { auth }
