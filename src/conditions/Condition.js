/* eslint-disable semi */
class Condition {
  constructor (f) {
    this.test = f
  }

  and (otherCondition) {
    return Condition.of((env) => {
      let r1 = this.test(env)
      if (!r1.passed) return r1

      let r2 = otherCondition.test(env)
      if (!r2.passed) return r2

      let reason = r1.reason.concat(r2.reason)
      return { passed: true, reason }
    })
  }

  andNot (otherCondition) {
    return this.and(otherCondition.negated())
  }

  or (otherCondition) {
    return Condition.of((env) => {
      let r = this.test(env)
      return r.passed ? r : otherCondition.test(env)
    })
  }

  negated () {
    return Condition.of((env) => {
      let { passed, reason } = this.test(env)
      return { passed: !passed, reason }
    })
  }

  static empty () {
    let id = { passed: true, reason: [] }
    return Condition.of(() => id)
  }

  static of (f) {
    return new Condition(f)
  }
}

module.exports = Condition
