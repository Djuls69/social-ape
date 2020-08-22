const { db } = require('../utils/firebase')

exports.getAllScreams = (req, res) => {
  let screams = []
  try {
    db.collection('screams')
      .orderBy('createdAt', 'desc')
      .get()
      .then(docs => {
        docs.forEach(scream =>
          screams.push({
            screamID: scream.id,
            body: scream.data().body,
            userHandle: scream.data().userHandle,
            createdAt: scream.data().createdAt
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
    createdAt: new Date().toISOString()
  }

  try {
    db.collection('screams')
      .add(newScream)
      .then(scream => res.json({ message: `scream ${scream.id} created successfully` }))
  } catch (err) {
    res.status(500).json({ error: "Can't create this scream" })
    console.error(err.message)
  }
}
