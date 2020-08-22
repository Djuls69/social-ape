const { admin } = require('../utils/admin')
const { db } = require('../utils/firebase')

exports.FBAuth = (req, res, next) => {
  let idToken
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    idToken = req.headers.authorization.split('Bearer ')[1]
  } else {
    console.error('No token found')
    return res.status(403).json({ error: 'Non autorisé.' })
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
      req.user = decodedToken
      return db.collection('users').where('userId', '==', req.user.uid).get()
    })
    .then(data => {
      req.user.handle = data.docs[0].data().handle
      return next()
    })
    .catch(err => {
      console.error('Error while verifying token', err.message)
      return res.status(403).json(err)
    })
}
