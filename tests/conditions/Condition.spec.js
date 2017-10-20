/* eslint-disable semi */
const Condition = require('../../src/conditions/Condition');

describe('Condition', () => {
  const passed = Condition.of(() => ({
    passed: true,
    reason: ['this is a passed condition']
  }))

  const failed = Condition.of(() => ({
    passed: false,
    reason: ['this is a failed condition']
  }))

  describe('#empty', () => {
    it('should create an empty condition', () => {
      let c = Condition.empty()
      expect(c.test()).toEqual({ passed: true, reason: [] })
    })
  })

  describe('#of', () => {
    it('should create a new condition', () => {
      let c = Condition.of(() => ({
        passed: false,
        reason: ['just because']
      }))
      expect(c.test()).toEqual({ passed: false, reason: ['just because'] })
    })
  })

  describe('.and', () => {
    it('should create a composite condition', () => {
      let c = Condition.empty().and(failed)
      expect(c.test()).toEqual({ passed: false, reason: ['this is a failed condition'] })
    })
  })

  describe('.andNot', () => {
    it('should create a composite negated condition', () => {
      let c = Condition.empty().andNot(passed)
      expect(c.test()).toEqual({ passed: false, reason: ['this is a passed condition'] })
    })
  })

  describe('.or', () => {
    it('should create a passing condition if one branch passes', () => {
      let c1 = passed.or(failed)
      let c2 = failed.or(passed)
      expect(c1.test()).toEqual({ passed: true, reason: ['this is a passed condition'] })
      expect(c2.test()).toEqual({ passed: true, reason: ['this is a passed condition'] })
    })

    it('should create a failing condition if both branches fail', () => {
      let c = failed.or(failed)
      expect(c.test()).toEqual({ passed: false, reason: ['this is a failed condition'] })
    })
  })

  describe('.negated', () => {
    it('should negate a passing condition', () => {
      let c = passed.negated()
      expect(c.test()).toEqual({ passed: false, reason: ['this is a passed condition'] })
    })

    it('should negate a failing condition', () => {
      let c = failed.negated()
      expect(c.test()).toEqual({ passed: true, reason: ['this is a failed condition'] })
    })
  })
})
