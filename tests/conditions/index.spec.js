/* eslint-disable semi */
const H = require('../../src/helpers')
const Condition = require('../../src/conditions/Condition')
const Env = require('../../src/conditions/Environment')
const conditions = require('../../src/conditions')

let fakeIsStringHashInFraction = (str, frac) =>
  (str === 'hash_to_0_25' && frac >= 0.25) ||
  (str === 'hash_to_0_75' && frac >= 0.75)

let makeEnv = (guid, options, account) => Env.empty()
  .set(Env.GUID, () => guid)
  .set(Env.WALLET_OPTIONS, () => options)
  .set(Env.ACCOUNT_INFO, () => account)

describe('conditions', () => {
  describe('.isInRolloutGroup', () => {
    beforeEach(() => {
      spyOn(H, 'isStringHashInFraction').and.callFake(fakeIsStringHashInFraction)
    })

    it('should pass when the user is in a feature rollout group', () => {
      let env = makeEnv('hash_to_0_25', { feat: { rolloutFraction: 0.3 } }, null)
      let result = conditions.isInRolloutGroup('feat').test(env)
      expect(result.passed).toEqual(true)
      expect(result.reason).toEqual(['in_rollout_group'])
    })

    it('should fail when the user is not in a feature rollout group', () => {
      let env = makeEnv('hash_to_0_75', { feat: { rolloutFraction: 0.7 } }, null)
      let result = conditions.isInRolloutGroup('feat').test(env)
      expect(result.passed).toEqual(false)
      expect(result.reason).toEqual(['not_in_rollout_group'])
    })
  })

  describe('.isInStateWhitelist', () => {
    let accountInfo = { stateCodeGuess: 'NY' }

    it('should pass when the user is in the state whitelist', () => {
      let env = makeEnv(null, { feat: { statesWhitelist: ['NY'] } }, accountInfo)
      let result = conditions.isInStateWhitelist('feat').test(env)
      expect(result.passed).toEqual(true)
      expect(result.reason).toEqual(['in_state_whitelist'])
    })

    it('should pass when the state whitelist is a wildcard', () => {
      let env = makeEnv(null, { feat: { statesWhitelist: '*' } }, accountInfo)
      let result = conditions.isInStateWhitelist('feat').test(env)
      expect(result.passed).toEqual(true)
      expect(result.reason).toEqual(['in_state_whitelist'])
    })

    it('should fail when the user is not in the state whitelist', () => {
      let env = makeEnv(null, { feat: { statesWhitelist: ['CT'] } }, accountInfo)
      let result = conditions.isInStateWhitelist('feat').test(env)
      expect(result.passed).toEqual(false)
      expect(result.reason).toEqual(['not_in_state_whitelist'])
    })
  })

  describe('.isInCountryWhitelist', () => {
    let accountInfo = { countryCodeGuess: 'US' }

    it('should pass when the user is in the country whitelist', () => {
      let env = makeEnv(null, { feat: { countries: ['US'] } }, accountInfo)
      let result = conditions.isInCountryWhitelist('feat').test(env)
      expect(result.passed).toEqual(true)
      expect(result.reason).toEqual(['in_country_whitelist'])
    })

    it('should pass when the country whitelist is a wildcard', () => {
      let env = makeEnv(null, { feat: { countries: '*' } }, accountInfo)
      let result = conditions.isInCountryWhitelist('feat').test(env)
      expect(result.passed).toEqual(true)
      expect(result.reason).toEqual(['in_country_whitelist'])
    })

    it('should fail when the user is not in the country whitelist', () => {
      let env = makeEnv(null, { feat: { countries: ['JP'] } }, accountInfo)
      let result = conditions.isInCountryWhitelist('feat').test(env)
      expect(result.passed).toEqual(false)
      expect(result.reason).toEqual(['not_in_country_whitelist'])
    })
  })

  describe('.isInCountryBlacklist', () => {
    let accountInfo = { countryCodeGuess: 'US' }

    it('should pass when the user is in the country blacklist', () => {
      let env = makeEnv(null, { feat: { countriesBlacklist: ['US'] } }, accountInfo)
      let result = conditions.isInCountryBlacklist('feat').test(env)
      expect(result.passed).toEqual(true)
      expect(result.reason).toEqual(['in_country_blacklist'])
    })

    it('should fail when the user is not in the country blacklist', () => {
      let env = makeEnv(null, { feat: { countriesBlacklist: ['JP'] } }, accountInfo)
      let result = conditions.isInCountryBlacklist('feat').test(env)
      expect(result.passed).toEqual(false)
      expect(result.reason).toEqual(['not_in_country_blacklist'])
    })
  })

  describe('composite', () => {
    let makeAccountInfo = (countryCodeGuess, stateCodeGuess) =>
      ({ countryCodeGuess, stateCodeGuess })

    let makeOptions = (countries, statesWhitelist) =>
      ({ feat: { countries, statesWhitelist } })

    describe('.isInCountryWhitelist + .isInStateWhitelist', () => {
      let cond = Condition.empty()
        .and(conditions.isInCountryWhitelist('feat'))
        .and(conditions.isInStateWhitelist('feat'))

      it('should fail if not on country whitelist', () => {
        let env = makeEnv(null, makeOptions(['US'], ['NY']), makeAccountInfo('JP', null))
        let result = cond.test(env)
        expect(result.passed).toEqual(false)
      })

      it('should fail if not on state whitelist', () => {
        let env = makeEnv(null, makeOptions(['US'], ['NY']), makeAccountInfo('US', 'CT'))
        let result = cond.test(env)
        expect(result.passed).toEqual(false)
      })

      it('should pass if whitelists are satisfied', () => {
        let env = makeEnv(null, makeOptions(['US'], ['NY']), makeAccountInfo('US', 'NY'))
        let result = cond.test(env)
        expect(result.passed).toEqual(true)
      })
    })
  })
})
