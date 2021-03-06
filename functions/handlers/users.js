const { auth } = require('../utils/firebase')
const { db } = require('../utils/admin')
const { validateSignupData, validateLoginData, reduceUserDetails } = require('../utils/validators')
const { admin } = require('../utils/admin')
const configApp = require('../private/configApp')
const Busboy = require('busboy')
const path = require('path')
const os = require('os')
const fs = require('fs')

exports.signupUser = (req, res) => {
  let token, userId

  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  }

  const { errors, valid } = validateSignupData(newUser)
  if (!valid) return res.status(400).json(errors)

  db.collection('users')
    .doc(newUser.handle)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({ handle: 'Ce pseudo est déjà utilisé' })
      } else {
        return auth.createUserWithEmailAndPassword(newUser.email, newUser.password).catch(err => {
          console.error(err.message)
          if (err.message === 'The email address is already in use by another account.') {
            return res.status(400).json({ email: 'Cet email est déjà utilisé.' })
          } else {
            return res.status(500).json({ error: 'Oups, petit problème, veuillez réessayer.' })
          }
        })
      }
    })

    // User automatiquement loggé après s'être enregistrer
    .then(data => {
      userId = data.user.uid
      return data.user.getIdToken()
    })
    .then(dataToken => {
      token = dataToken
      const { handle, email } = newUser
      const userProfile = {
        createdAt: new Date().toISOString(),
        userId,
        email,
        handle,
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${configApp.storageBucket}/o/no-img.png?alt=media`
      }
      return db
        .collection('users')
        .doc(handle)
        .set(userProfile)
        .catch(err => {
          console.error(err.message)
          return res.status(500).json({ error: err.message })
        })
    })
    .then(() => res.json({ token }))
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: 'Oups, petit problème, veuillez réessayer.' })
    })
}

exports.loginUser = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  }

  const { errors, valid } = validateLoginData(user)
  if (!valid) return res.status(400).json(errors)

  auth
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken()
    })
    .then(token => res.json({ token }))
    .catch(err => {
      console.error(err.message)
      if (err.message === 'The password is invalid or the user does not have a password.') {
        return res.status(403).json({ general: 'Mauvais identifiants, merci de réessayer.' })
      } else if (
        err.message === 'There is no user record corresponding to this identifier. The user may have been deleted.'
      ) {
        return res.status(403).json({ general: 'Mauvais identifiants, merci de réessayer.' })
      }
      return res.status(500).json({ error: 'Oups, petit problème, veuillez réessayer.' })
    })
}

exports.uploadImage = (req, res) => {
  const busboy = new Busboy({ headers: req.headers })
  let imageToUpload = {}
  let imageFileName

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Uniquement jpeg/jpg ou png.' })
    }
    // my.image.png
    const imageExtension = filename.split('.')[filename.split('.').length - 1]
    // 124548945615869.png
    imageFileName = `${Math.round(Math.random() * 100000000000000)}.${imageExtension}`
    const filePath = path.join(os.tmpdir(), imageFileName)
    imageToUpload = { filePath, mimetype }
    file.pipe(fs.createWriteStream(filePath))
  })

  busboy.on('finish', () => {
    admin
      .storage()
      .bucket(configApp.storageBucket)
      .upload(imageToUpload.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contenType: imageToUpload.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${configApp.storageBucket}/o/${imageFileName}?alt=media`
        return db.collection('users').doc(req.user.handle).update({ imageUrl })
      })
      .then(() => {
        return res.status(201).json({ message: 'Image uploaded successfully' })
      })
      .catch(err => {
        console.error(err.message)
        return res.status(500).json({ error: err.message })
      })
  })
  busboy.end(req.rawBody)
}

exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body)
  db.collection('users')
    .doc(req.user.handle)
    .update(userDetails)
    .then(() => {
      return res.json({ message: 'Details added successfully' })
    })
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}

exports.getAuthenticatedUser = (req, res) => {
  let userData = {}
  db.collection('users')
    .doc(req.user.handle)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data()
        return db.collection('likes').where('userHandle', '==', req.user.handle).get()
      } else {
        return res.status(403).json({ error: 'Impossible de trouver cet utilisateur.' })
      }
    })
    .then(data => {
      userData.likes = []
      data.forEach(doc => {
        userData.likes.push(doc.data())
      })
      return db
        .collection('notifications')
        .where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
    })
    .then(data => {
      userData.notifications = []
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          screamId: doc.data().screamId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id
        })
      })
      return res.json(userData)
    })
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}

// Get any user's details
exports.getUserDetails = (req, res) => {
  let userData = {}
  db.collection('users')
    .doc(req.params.handle)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(403).json({ error: 'Impossible de trouver cet utilisateur.' })
      }
      userData = doc.data()
      return db.collection('screams').where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc').get()
    })
    .then(screams => {
      userData.screams = []
      screams.forEach(doc => {
        userData.screams.push({
          body: doc.data().body,
          commentCount: doc.data().commentCount,
          createdAt: doc.data().createdAt,
          likeCount: doc.data().likeCount,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          screamId: doc.id
        })
      })
      return res.json(userData)
    })
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}

exports.markNotificationRead = (req, res) => {
  let batch = db.batch()
  req.body.forEach(notificationId => {
    const notification = db.collection('notifications').doc(notificationId)
    batch.update(notification, { read: true })
  })
  batch
    .commit()
    .then(() => {
      return res.json({ message: 'Notifications lues.' })
    })
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}
