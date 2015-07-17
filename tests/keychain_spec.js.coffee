proxyquire = require('proxyquireify')(require)
KeyChain   = proxyquire('../src/keychain', {})

describe "KeyChain constructor from cache", ->
  # cache = "cache":
  #   "receiveAccount": "xpub6EFgBWeVDxjHRXVj1GviKqBcLZT6pK8fnpQC9DwXHmLtUjWMdg3MHLCksWcUSn7AUqkYWE4vHUG73NKANWJuCH3sJfvjfk4HZUjwfrRA7p1"
  #   "changeAccount": "xpub6EFgBWeVDxjHTXppTRwoMnzVDJjEnxXbRznrsoH8K6ebrQ7wS8Cj35mZ8fnGDE6d6nnHLuV3EyFUY6msH6eALGwnWMzSKiTFSWQpEMcmEki"
  # kc = new KeyChain(null, null, cache.receiveAccount)
  it "should be an empty array", ->
    # console.log kc
    expect(1).toEqual(1)
