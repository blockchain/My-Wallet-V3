proxyquire = require('proxyquireify')(require)

stubs = {
}

API    = proxyquire('../src/api', stubs)

describe "API", ->
  describe "encodeFormData", ->
    it "should encode a flat list", ->
      data = {
        foo: "bar",
        alice: "bob"
      }
      expect(API.encodeFormData(data)).toEqual("foo=bar&alice=bob")

    it "should encode a nested list", ->
      # Currently results in [object object]
      pending()
      data = {
        foo: "bar",
        name: {
          first: "bob"
        }
      }
      expect(API.encodeFormData(data)).toEqual("...")
