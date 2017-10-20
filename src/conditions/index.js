/* eslint-disable semi */
const H = require('../helpers')
const Condition = require('./Condition')
const Env = require('./Environment')

const passedWithReason = (passed, reason) => ({
  passed, reason: [passed ? reason : 'not_' + reason]
})

exports.isInRolloutGroup = (feature) => Condition.of((env) => {
  let guid = env.get(Env.GUID)
  let options = env.get(Env.WALLET_OPTIONS)[feature]

  let passed = (
    H.isStringHashInFraction(guid, options.rolloutFraction)
  )

  return passedWithReason(passed, 'in_rollout_group')
})

exports.isInStateWhitelist = (feature) => Condition.of((env) => {
  let accountInfo = env.get(Env.ACCOUNT_INFO)
  let options = env.get(Env.WALLET_OPTIONS)[feature]

  let passed = (
    accountInfo.stateCodeGuess == null ||
    options.statesWhitelist === '*' ||
    options.statesWhitelist.indexOf(accountInfo.stateCodeGuess) > -1
  )

  return passedWithReason(passed, 'in_state_whitelist')
})

exports.isInCountryWhitelist = (feature) => Condition.of((env) => {
  let accountInfo = env.get(Env.ACCOUNT_INFO)
  let options = env.get(Env.WALLET_OPTIONS)[feature]

  let passed = (
    accountInfo.countryCodeGuess == null ||
    options.countries === '*' ||
    options.countries.indexOf(accountInfo.countryCodeGuess) > -1
  )

  return passedWithReason(passed, 'in_country_whitelist')
})

exports.isInCountryBlacklist = (feature) => Condition.of((env) => {
  let accountInfo = env.get(Env.ACCOUNT_INFO)
  let options = env.get(Env.WALLET_OPTIONS)[feature]

  let passed = (
    accountInfo.countryCodeGuess == null ||
    options.countriesBlacklist.indexOf(accountInfo.countryCodeGuess) > -1
  )

  return passedWithReason(passed, 'in_country_blacklist')
})

exports.isUsingTestnet = Condition.of((env) => {
  let options = env.get(Env.WALLET_OPTIONS)
  return passedWithReason(options.network === 'testnet', 'using_testnet')
})
