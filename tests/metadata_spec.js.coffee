# proxyquire = require('proxyquireify')(require)
#
# OriginalWalletCrypto = require('../src/wallet-crypto');
#
# MyWallet =
#   wallet:
#     syncWallet: () ->
#     hdwallet:
#       getMasterHDNode: () ->
#         deriveHardened: (purpose) ->
#           deriveHardened: (payloadType) ->
#             deriveHardened: (i) ->
#               path = "m/#{ purpose }'/#{ payloadType }'/#{ i }'"
#               {
#                 getAddress: () -> path + "-address"
#                 getPublicKeyBuffer: () ->
#                   slice: (start, offset) ->
#                     "#{ path }-pubkey-buffer-slice-#{ start }-#{ offset }"
#                 keyPair:
#                   toString: () -> "#{ path }-keyPair"
#                   d:
#                     toBuffer: () ->
#                       "#{ path }-private-key-buffer"
#               }
#
# BitcoinJS = {
#   message:
#     magicHash: (payload) ->
#       "#{ payload }|magicHash"
#     sign: (keyPair, payload) ->
#       "#{ payload }|#{ keyPair }-signature"
#     verify: (address, signatureBuffer, message) ->
#       signature = signatureBuffer.toString('utf8')
#       key = address.replace("0'-address", "0'-keyPair")
#       if signature.indexOf(key) == -1
#         false
#       else
#         true
# }
#
# WalletCrypto = {
#   sha256: (x) ->
#     if x == "info.blockchain.metadata"
#       OriginalWalletCrypto.sha256(x) # Too tedious to mock
#     else
#       "#{ x }|sha256"
#
#   encryptDataWithKey: (data, key) ->
#     "random|#{ data }|encrypted-with-random+#{ key }|base64"
#
#
#   decryptDataWithKey: (data, key) ->
#     payload = data.split('|')[1]
# }
#
# stubs = {
#   './wallet': MyWallet,
#   './wallet-crypto': WalletCrypto,
#   'bitcoinjs-lib': BitcoinJS
# }
#
# Metadata = proxyquire('../src/metadata', stubs)
#
# describe "Metadata", ->
#
#   c = undefined
#   helloWorld = {hello: "world"}
#   unencryptedData = JSON.stringify(helloWorld)
#   encryptedData = "random|#{ unencryptedData }|encrypted-with-random+m/510742'/2'/1'-private-key-buffer|sha256|base64"
#   serverPayload = {
#     version:1,
#     payload_type_id:2
#     payload: encryptedData,
#     signature:"#{ encryptedData }|m/510742'/2'/0'-keyPair-signature",
#     created_at:1468316898000,
#     updated_at:1468316941000,
#   }
#   expectedPayloadPOST = {
#     version:1,
#     payload_type_id:2
#     payload: encryptedData,
#     signature:"#{ encryptedData }|m/510742'/2'/0'-keyPair-signature"
#   }
#   unencryptedDataPUT = JSON.stringify({hello: 'world again'})
#   encryptedDataPUT = "random|#{ unencryptedDataPUT }|encrypted-with-random+m/510742'/2'/1'-private-key-buffer|sha256|base64"
#
#   expectedPayloadPUT = {
#     version:1,
#     payload_type_id:2
#     prev_magic_hash: "#{ unencryptedDataPUT }|magicHash"
#     payload: encryptedDataPUT,
#     signature:"#{ encryptedDataPUT }|m/510742'/2'/0'-keyPair-signature"
#   }
#
#   beforeEach ->
#     JasminePromiseMatchers.install()
#
#   afterEach ->
#     JasminePromiseMatchers.uninstall()
#
#   describe "class", ->
#     describe "new Metadata()", ->
#
#       it "should instantiate", ->
#         c = new Metadata(2)
#         expect(c.constructor.name).toEqual("Metadata")
#
#       it "should set the address", ->
#         expect(c._address).toEqual("m/510742'/2'/0'-address")
#
#       it "should set the signature KeyPair", ->
#         expect(c._signatureKeyPair.toString()).toEqual("m/510742'/2'/0'-keyPair")
#
#       it "should set the encryption key", ->
#         expect(c._encryptionKey.toString()).toEqual("m/510742'/2'/1'-private-key-buffer|sha256")
#
#
#   describe "API", ->
#     beforeEach ->
#       c = new Metadata(2)
#       spyOn(c, "request").and.callFake((method, endpoint, data) ->
#         if method == "GET" && endpoint == ""
#           new Promise((resolve) -> resolve(serverPayload))
#         else # 404 is resolved as null
#           new Promise((resolve) -> resolve(null))
#       )
#
#     describe "API", ->
#       describe "GET", ->
#         it "should call request with GET", ->
#           c.GET("m/510742'/2'/0'-keyPair")
#           expect(c.request).toHaveBeenCalledWith(
#             'GET',
#             "m/510742'/2'/0'-keyPair",
#             undefined
#           )
#
#         it "should resolve with an encrypted payload",  ->
#           promise = c.GET("m/510742'/2'/0'-keyPair")
#           expect(promise).toBeResolvedWith(serverPayload)
#
#         it "should resolve 404 with null",  ->
#           promise = c.GET("m/510742'/3'/0'-keyPair")
#           expect(promise).toBeResolvedWith(null)
#
#       describe "POST", ->
#         it "should call request with POST", ->
#           c.POST("m/510742'/3'/0'-keyPair", "new_payload")
#           expect(c.request).toHaveBeenCalledWith(
#             'POST',
#             "m/510742'/3'/0'-keyPair",
#             "new_payload"
#           )
#
#       describe "PUT", ->
#         it "should call request with PUT", ->
#           c.PUT("m/510742'/3'/0'-keyPair", "new_payload")
#           expect(c.request).toHaveBeenCalledWith(
#             'PUT',
#             "m/510742'/3'/0'-keyPair",
#             "new_payload"
#           )
#
#   describe "instance", ->
#     promise = undefined
#
#     beforeEach ->
#       c = new Metadata(2)
#
#       spyOn(c, "GET").and.callFake((endpoint, data) ->
#         new Promise (resolve, reject) ->
#           if endpoint == "m/510742'/2'/0'-address" # 200
#             payloadWithBase64sig = JSON.parse(JSON.stringify(serverPayload));
#             payloadWithBase64sig.signature = Buffer(serverPayload.signature, 'utf8').toString('base64')
#             resolve(payloadWithBase64sig)
#           else if endpoint == "m/510742'/3'/0'-address" # 404
#             resolve(null)
#           else
#             reject("Unknown endpoint")
#       )
#
#       spyOn(c, "POST").and.callFake((endpoint, data) ->
#         new Promise (resolve, reject) ->
#           if endpoint == "m/510742'/2'/0'-address"
#             if data.payload && data.payload.split('|')[1] == '"fail"'
#               reject()
#             else
#               resolve({})
#           else
#             reject("Unknown endpoint")
#       )
#
#       spyOn(c, "PUT").and.callFake((endpoint, data) ->
#         new Promise (resolve, reject) ->
#           if endpoint == "m/510742'/2'/0'-address"
#             resolve({})
#           else
#             reject("Unknown endpoint")
#       )
#
#     describe "setMagicHash", ->
#       it "should calculate and store based on contents", ->
#         c.setMagicHash(encryptedData)
#         expect(c._magicHash).toEqual("#{ encryptedData }|magicHash")
#
#     describe "create", ->
#       it "should encrypt data", (done) ->
#         spyOn(WalletCrypto, "encryptDataWithKey")
#         c.create({hello: 'world'}).then ->
#           expect(WalletCrypto.encryptDataWithKey).toHaveBeenCalledWith(
#             JSON.stringify({hello: 'world'}),
#             c._encryptionKey
#           )
#         done()
#
#       it "magicHash should be null initially", ->
#         expect(c._magicHash).toEqual(null)
#
#       it "value should be null initially", ->
#         expect(c._value).toEqual(null)
#
#       describe "POST", ->
#         postData = undefined
#
#         beforeEach (done) ->
#           c.create({hello: 'world'}).then ->
#             postData = c.POST.calls.argsFor(0)[1]
#             done()
#
#         it "should be called", ->
#           expect(c.POST).toHaveBeenCalled()
#
#         it "should use the right address", ->
#           expect(c.POST.calls.argsFor(0)[0]).toEqual("m/510742'/2'/0'-address")
#
#         it "should use version 1", ->
#           expect(postData.version).toEqual(1)
#
#         it "should use the right payload type", ->
#           expect(postData.payload_type_id).toEqual(c._payloadTypeId)
#
#         it "should send encrypted payload", ->
#           expect(postData.payload).toEqual(expectedPayloadPOST.payload)
#
#         it "should send signature", ->
#           expect(postData.signature).toEqual(expectedPayloadPOST.signature)
#
#         it "should not send additional arguments", ->
#           expect(Object.keys(postData).length).toEqual(4)
#
#       describe "if successful", ->
#         beforeEach ->
#           promise = c.create({hello: 'world'})
#
#         it "should resolve", (done) ->
#           expect(promise).toBeResolved(done)
#
#         it "should remember the new value", (done) ->
#           promise.then(() ->
#             expect(c._value).toEqual({hello: "world"})
#             done()
#           )
#
#         it "should remember the magic hash", (done) ->
#           promise.then(() ->
#             expect(c._magicHash).toEqual("random|{\"hello\":\"world\"}|encrypted-with-random+m/510742'/2'/1'-private-key-buffer|sha256|base64|magicHash")
#             done()
#           )
#
#       describe "if failed", ->
#         beforeEach ->
#           promise = c.create('fail')
#
#         it "should reject", (done) ->
#           expect(promise).toBeRejected(done)
#
#         it "should not have a value or magic hash", (done) ->
#           promise.catch(() ->
#             expect(c._magicHash).toEqual(null)
#             done()
#           )
#
#     describe "fetch", ->
#       it "magicHash should be null initially", ->
#         expect(c._magicHash).toEqual(null)
#
#       it "value should be null initially", ->
#         expect(c._value).toEqual(null)
#
#       it "should GET", (done) ->
#         c.fetch().then ->
#           expect(c.GET).toHaveBeenCalled()
#           done()
#
#       it "should use the right address", (done) ->
#         c.fetch().then ->
#           expect(c.GET.calls.argsFor(0)[0]).toEqual("m/510742'/2'/0'-address")
#           done()
#
#       it "should decrypt data and verify signature", (done) ->
#         spyOn(WalletCrypto, "decryptDataWithKey").and.callThrough()
#         spyOn(BitcoinJS.message, "verify").and.callThrough()
#
#         c.fetch().then(() ->
#           expect(WalletCrypto.decryptDataWithKey).toHaveBeenCalledWith(
#             encryptedData,
#             c._encryptionKey
#           )
#
#           expect(BitcoinJS.message.verify).toHaveBeenCalled()
#
#           args = BitcoinJS.message.verify.calls.argsFor(0)
#
#           expect(args[0]).toEqual("m/510742'/2'/0'-address")
#           expect(args[1].toString('utf8')).toEqual(serverPayload.signature)
#           expect(args[2]).toEqual(encryptedData)
#
#           done()
#         )
#
#
#
#       describe "if successful", ->
#         beforeEach ->
#           promise = c.fetch()
#
#         it "should resolve with payload", (done) ->
#           expect(promise).toBeResolvedWith(jasmine.objectContaining({hello: "world"}), done)
#
#         it "should remember the new value", (done) ->
#           promise.then(() ->
#             expect(c._value).toEqual({hello: "world"})
#             done()
#           )
#
#         it "should remember the magic hash", (done) ->
#           promise.then(() ->
#             expect(c._magicHash).toEqual("random|{\"hello\":\"world\"}|encrypted-with-random+m/510742'/2'/1'-private-key-buffer|sha256|base64|magicHash")
#             done()
#           )
#
#       describe "if resolved with null", ->
#         beforeEach ->
#             c._payloadTypeId = 3
#             c._address = "m/510742'/3'/0'-address"
#             promise = c.fetch()
#
#         it "should return null", (done) ->
#           expect(promise).toBeResolvedWith(null)
#           done()
#
#         it "should not have a value or magic hash", (done) ->
#           promise.then((val) ->
#             expect(c._magicHash).toEqual(null)
#             done()
#           )
#
#       describe "if failed", ->
#         beforeEach ->
#             c._payloadTypeId = -1
#             c._address = "fail"
#             promise = c.fetch()
#
#         it "should reject", (done) ->
#           expect(promise).toBeRejected()
#           done()
#
#         it "should not have a value or magic hash", (done) ->
#           promise.catch(() ->
#             expect(c._magicHash).toEqual(null)
#             done()
#           )
#
#     describe "update", ->
#       beforeEach ->
#         c._magicHash = "random|{\"hello\":\"world\"}|encrypted-with-random+m/510742'/2'/1'-private-key-buffer|sha256|base64|magicHash"
#         c._value = helloWorld
#         c._previousPayload = '{"hello":"world"}'
#         spyOn(WalletCrypto, "encryptDataWithKey").and.callThrough()
#
#       it "should immedidately resolve for identical object", (done) ->
#         promise = c.update(helloWorld)
#         expect(promise).toBeResolved()
#         promise.then(() ->
#           expect(WalletCrypto.encryptDataWithKey).not.toHaveBeenCalled()
#           done()
#         )
#
#       it "should immedidately resolve for the same string", (done) ->
#         promise = c.update({hello: 'world'})
#         expect(promise).toBeResolved()
#         promise.then(() ->
#           expect(WalletCrypto.encryptDataWithKey).not.toHaveBeenCalled()
#           done()
#         )
#
#       it "should update on the server",  (done) ->
#         promise = c.update({hello: 'world again'})
#         expect(promise).toBeResolved()
#
#         promise.then(() ->
#           expect(WalletCrypto.encryptDataWithKey).toHaveBeenCalledWith(
#             JSON.stringify({hello: 'world again'}),
#             c._encryptionKey
#           )
#
#           done()
#         )
#
#       describe "PUT", ->
#         prevHash = undefined
#         putData = undefined
#
#         beforeEach (done) ->
#           prevHash = c._magicHash
#           c.update({hello: 'world again'}).then ->
#             putData = c.PUT.calls.argsFor(0)[1]
#             done()
#
#         it "should be called", ->
#           expect(c.PUT).toHaveBeenCalled()
#
#         it "should use the right address", ->
#           expect(c.PUT.calls.argsFor(0)[0]).toEqual("m/510742'/2'/0'-address")
#
#         it "should use version 1", ->
#           expect(putData.version).toEqual(1)
#
#         it "should use the right payload type", ->
#           expect(putData.payload_type_id).toEqual(c._payloadTypeId)
#
#         it "should send the previous magic hash", ->
#           expect(putData.prev_magic_hash).toEqual(prevHash)
#
#         it "should send encrypted payload", ->
#           expect(putData.payload).toEqual(expectedPayloadPUT.payload)
#
#         it "should send signature", ->
#           expect(putData.signature).toEqual(expectedPayloadPUT.signature)
#
#         it "should not send additional arguments", ->
#           expect(Object.keys(putData).length).toEqual(5)
#
#       describe "if successful", ->
#         beforeEach ->
#           promise = c.update({hello: 'world again'})
#
#         it "should remember the new value", (done) ->
#           promise.then(() ->
#             expect(c._value).toEqual({hello: "world again"})
#             done()
#           )
#
#         it "should remember the magic hash", (done) ->
#           promise.then(() ->
#             expect(c._magicHash).toEqual("random|{\"hello\":\"world again\"}|encrypted-with-random+m/510742'/2'/1'-private-key-buffer|sha256|base64|magicHash")
#             done()
#           )
#
#       describe "if failed", ->
#         beforeEach ->
#             c._payloadTypeId = -1
#             c._address = "fail"
#             promise = c.update({hello: 'world again'})
#
#         it "should reject", (done) ->
#           expect(promise).toBeRejected()
#           done()
#
#         it "should keep the previous value", (done) ->
#           promise.catch(() ->
#             expect(c._value).toEqual(helloWorld)
#             done()
#           )
#
#         it "should keep the previous magic hash", (done) ->
#           promise.catch(() ->
#             expect(c._magicHash).toEqual("random|{\"hello\":\"world\"}|encrypted-with-random+m/510742'/2'/1'-private-key-buffer|sha256|base64|magicHash")
#             done()
#           )
