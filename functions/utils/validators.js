// Helpers
const isEmpty = string => {
  if (string.trim() === '') return true
  return false
}
const isEmail = email => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  if (email.match(emailRegEx)) return true
  return false
}

exports.validateSignupData = data => {
  const errors = {}

  if (isEmpty(data.email)) {
    errors.email = 'Merci de remplir ce champ.'
  } else if (!isEmail(data.email)) {
    errors.email = "Merci d'indiquer un email valide."
  }

  if (isEmpty(data.password)) {
    errors.password = 'Merci de remplir ce champ.'
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas.'
  }

  if (isEmpty(data.handle)) {
    errors.handle = 'Merci de remplir ce champ.'
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  }
}

exports.validateLoginData = data => {
  const errors = {}

  if (isEmpty(data.email)) {
    errors.email = 'Merci de remplir ce champ.'
  } else if (!isEmail(data.email)) {
    errors.email = "Merci d'indiquer un email valide."
  }

  if (isEmpty(data.password)) {
    errors.password = 'Merci de remplir ce champ.'
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  }
}

exports.reduceUserDetails = data => {
  let userDetails = {}

  if (!isEmpty(data.bio.trim())) {
    userDetails.bio = data.bio
  }

  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== 'http') {
      userDetails.website = `http://${data.website}`
    } else {
      userDetails.website = data.website
    }
  }

  if (!isEmpty(data.location.trim())) {
    userDetails.location = data.location
  }

  return userDetails
}
