let API = require('../src/api');

describe('API', () => {
  describe('encodeFormData', () => {
    it('should encode a flat list', () => {
      let data = { foo: 'bar', alice: 'bob' };
      expect(API.encodeFormData(data)).toEqual('foo=bar&alice=bob');
    });

    it('should encode a nested list', () => {
      pending();
      let data = {
        foo: 'bar',
        name: { first: 'bob' }
      };
      expect(API.encodeFormData(data)).toEqual('...');
    });
  });
});
