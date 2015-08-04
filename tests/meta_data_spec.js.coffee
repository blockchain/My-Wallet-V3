proxyquire = require('proxyquireify')(require)

$ = {}

stubs =
  'jquery': $

MetaData = proxyquire('../src/meta-data', stubs)


describe "MetaData", ->

  describe "setEndpoint()", ->
    it "should allow a custom endpoint", ->
      expect(typeof(MetaData.setEndpoint)).toBe("function")
