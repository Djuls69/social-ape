const admin = require('firebase-admin')
const serviceAccount = require('../private/social-ape-6bd3d-firebase-adminsdk-ljmk3-7e1a3bed41.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://social-ape-6bd3d.firebaseio.com'
})

module.exports = { admin }
