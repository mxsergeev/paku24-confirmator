const sentCommunications = {
  email: [],
  sms: [],
}

function recordEmail(message) {
  sentCommunications.email.push({ ...message })
}

function recordSms(message) {
  sentCommunications.sms.push({ ...message })
}

function clearSentCommunications() {
  sentCommunications.email = []
  sentCommunications.sms = []
}

function getSentCommunications() {
  return JSON.parse(JSON.stringify(sentCommunications))
}

export { clearSentCommunications, getSentCommunications, recordEmail, recordSms }
