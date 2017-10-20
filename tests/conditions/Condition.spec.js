/* eslint-disable semi */
const Condition = require('../../src/conditions/Condition');

describe('Condition', () => {
  const passed = Condition.of(() => ({ passed: true, reason: ['cond_passing'] }))
  const failed = Condition.of(() => ({ passed: false, reason: ['cond_failing'] }))

  describe('#empty', () => {
    it('should create an empty condition', () => {
      let c = Condition.empty()
      expect(c.test()).toEqual({ passed: true, reason: [] })
    })
  })

  describe('#of', () => {
    it('should create a new condition', () => {
      let c = Condition.of(() => ({ passed: false, reason: ['reason'] }))
      expect(c.test()).toEqual({ passed: false, reason: ['reason'] })
    })
  })

  describe('.and', () => {
    it('should create a composite condition', () => {
      let c = Condition.empty().and(failed)
      expect(c.test()).toEqual(failed.test())
    })

    it('should include all reasons for a passing condition', () => {
      let c = passed.and(passed)
      expect(c.test()).toEqual({ passed: true, reason: ['cond_passing', 'cond_passing'] })
    })

    it('should short-circuit on a failed first condition', () => {
      let spy = jasmine.createSpy('test cond')
      let c = failed.and(Condition.of(() => spy()))
      expect(c.test()).toEqual(failed.test())
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('.andNot', () => {
    it('should create a composite negated condition', () => {
      let c = Condition.empty().andNot(passed)
      expect(c.test()).toEqual({ passed: false, reason: ['cond_passing'] })
    })
  })

  describe('.or', () => {
    it('should create a passing condition if one branch passes', () => {
      let c1 = passed.or(failed)
      let c2 = failed.or(passed)
      expect(c1.test()).toEqual(passed.test())
      expect(c2.test()).toEqual(passed.test())
    })

    it('should create a failing condition if both branches fail', () => {
      let c = failed.or(failed)
      expect(c.test()).toEqual(failed.test())
    })

    it('should short-circuit on a passed first condition', () => {
      let spy = jasmine.createSpy('test cond')
      let c = passed.or(Condition.of(() => spy()))
      expect(c.test()).toEqual(passed.test())
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('.negated', () => {
    it('should negate a passing condition', () => {
      let c = passed.negated()
      expect(c.test()).toEqual({ passed: false, reason: ['cond_passing'] })
    })

    it('should negate a failing condition', () => {
      let c = failed.negated()
      expect(c.test()).toEqual({ passed: true, reason: ['cond_failing'] })
    })
  })
})
