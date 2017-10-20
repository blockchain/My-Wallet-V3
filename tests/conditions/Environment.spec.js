/* eslint-disable semi */
const Environment = require('../../src/conditions/Environment');

describe('Environment', () => {
  const env = Environment.empty()

  describe('.set', () => {
    it('should set a property getter', () => {
      let e = env.set('prop', () => 'val')
      expect(e.get('prop')).toEqual('val')
    })

    it('should require that the getter is a function', () => {
      let fail = () => env.set('prop', 'val')
      expect(fail).toThrow()
    })
  })

  describe('.has', () => {
    it('should be true when the env property exists', () => {
      let e = env.set('prop', () => 'val')
      expect(e.has('prop')).toEqual(true)
    })

    it('should be false when the env property does not exist', () => {
      expect(env.has('prop')).toEqual(false)
    })

    it('should not call the prop getter', () => {
      let spy = jasmine.createSpy('getter')
      let e = env.set('prop', spy)
      expect(e.has('prop')).toEqual(true)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('.get', () => {
    it('should evaluate the env getter', () => {
      let e = env.set('prop', () => 'val')
      expect(e.get('prop')).toEqual('val')
    })

    it('should require that the getter exists', () => {
      let fail = () => env.get('prop')
      expect(fail).toThrow()
    })
  })
})
