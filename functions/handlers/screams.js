const { db } = require('../utils/admin')

exports.getAllScreams = (req, res) => {
  let screams = []
  try {
    db.collection('screams')
      .orderBy('createdAt', 'desc')
      .get()
      .then(docs => {
        docs.forEach(scream =>
          screams.push({
            screamId: scream.id,
            body: scream.data().body,
            userHandle: scream.data().userHandle,
            userImage: scream.data().userImage,
            createdAt: scream.data().createdAt,
            likes: scream.data().likeCount,
            comments: scream.data().commentCount
          })
        )
        return res.json(screams)
      })
  } catch (err) {
    console.error(err.message)
  }
}

exports.postOneScream = (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    userImage: req.user.imageUrl,
    likeCount: 0,
    commentCount: 0
  }

  try {
    db.collection('screams')
      .add(newScream)
      .then(scream => {
        newScream.screamId = scream.id
        return res.json(newScream)
      })
  } catch (err) {
    res.status(500).json({ error: "Can't create this scream" })
    console.error(err.message)
  }
}

exports.getScream = (req, res) => {
  let screamData = {}
  db.collection('screams')
    .doc(req.params.screamId)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.json(404).json({ message: 'Post introuvable.' })
      }
      screamData = doc.data()
      screamData.screamId = doc.id
      return db.collection('comments').orderBy('createdAt', 'desc').where('screamId', '==', req.params.screamId).get()
    })
    .then(data => {
      screamData.comments = []
      data.forEach(doc => {
        screamData.comments.push(doc.data())
      })
      return res.json(screamData)
    })
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}

exports.commentOnScream = (req, res) => {
  if (req.body.body.trim() === '') {
    return res.status(400).json({ error: "Merci d'entrer votre commentaire." })
  }
  const newComment = {
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    body: req.body.body
  }

  db.collection('screams')
    .doc(req.params.screamId)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ message: 'Post introuvable' })
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 })
    })
    .then(() => db.collection('comments').add(newComment))
    .then(() => res.json(newComment))
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}

exports.likeScream = (req, res) => {
  let screamData = {}
  const likeDocument = db
    .collection('likes')
    .where('screamId', '==', req.params.screamId)
    .where('userHandle', '==', req.user.handle)
    .limit(1)
  const screamDocument = db.collection('screams').doc(req.params.screamId)

  screamDocument
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ message: 'Post introuvable' })
      }
      screamData = doc.data()
      screamData.id = doc.id
      return likeDocument.get()
    })
    .then(data => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            screamId: req.params.screamId,
            userHandle: req.user.handle
          })
          .then(() => {
            screamData.likeCount++
            return screamDocument.update({ likeCount: screamData.likeCount })
          })
          .then(() => {
            return res.json(screamData)
          })
      } else {
        return res.json({ message: 'Seulement une fois.' })
      }
    })
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}

exports.unlikeScream = (req, res) => {
  let screamData = {}
  const likeDocument = db
    .collection('likes')
    .where('screamId', '==', req.params.screamId)
    .where('userHandle', '==', req.user.handle)
    .limit(1)
  const screamDocument = db.collection('screams').doc(req.params.screamId)

  screamDocument
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ message: 'Post introuvable' })
      }
      screamData = doc.data()
      screamData.id = doc.id
      return likeDocument.get()
    })
    .then(data => {
      if (data.empty) {
        return res.json({ message: 'Opération impossible.' })
      } else {
        return db
          .collection('likes')
          .doc(data.docs[0].id)
          .delete()
          .then(() => {
            screamData.likeCount--
            screamDocument.update({ likeCount: screamData.likeCount })
          })
          .then(() => res.json(screamData))
      }
    })
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}

exports.deleteScream = (req, res) => {
  const screamDoc = db.collection('screams').doc(req.params.screamId)

  screamDoc
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ message: 'Post introuvable' })
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ message: 'Opération non autorisé' })
      }
      return screamDoc.delete()
    })
    .then(() => res.json({ message: 'Post correctement supprimé.' }))
    .catch(err => {
      console.error(err.message)
      return res.status(500).json({ error: err.message })
    })
}
