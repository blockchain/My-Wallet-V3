describe "BIP38", ->
  
  observer = 
    success: (key) ->
      console.log("Success!")
      console.log(key)
    wrong_password: () ->
      console.log("Wrong password!")
    error: (err) ->
      console.log("Some error")
      console.log(err) 

  beforeEach ->
    # overrride as a temporary solution
    window.setTimeout = (myFunction) -> myFunction()

    # preimages of Crypto_scrypt
    wrongPassword = "WRONG_PASSWORD" + "e957a24a" + "16384" + "8" + "8" + "64"
    testVector1 = "TestingOneTwoThree" + "e957a24a" + "16384" + "8" + "8" + "64"
    testVector2 = "Satoshi" + "572e117e" + "16384" + "8" + "8" + "64"
    testVector3 = "ϓ␀𐐀💩" + "f4e775a8" + "16384" + "8" + "8" + "64"
    testVector4 = "TestingOneTwoThree" + "43be4179" + "16384" + "8" + "8" + "64"
    testVector5 = "Satoshi" + "26e017d2" + "16384" + "8" + "8" + "64"

    # images of Crypto_scrypt
    Crypto_scrypt_cache = {}
    Crypto_scrypt_cache[wrongPassword] = 
      Buffer "e39fc025591c26f6ebd47077b869958fedcb88df623fd6743fab116fefac0a4e1d\
              13216d5e4294d15fd79772b8a91da612a030935ec30aa4f97c0adee73539a6","hex"
    Crypto_scrypt_cache[testVector1] = 
      Buffer "f87648a6b42fdd86ef6837a249cde15318f264d43a859b610e78ea63d51cb2d3e6\
              0bf44bfb29d543bba24afcccfadbfc6ef9312fcccf589fa5ea1366ec21e4c0","hex"
    Crypto_scrypt_cache[testVector2] = 
      Buffer "02d4a6b94240bd1cdaa6773f430e43a0d9a8cbc9a83b044998f7ef2e3f31a4de7f\
              2436fede417c46b988879f4ef0595b75a55bcaec27848ef94e9f4b4d684cb9","hex"
    Crypto_scrypt_cache[testVector3] = 
      Buffer "0e271b33f58006bbdc84850456f508cffc661f26909462995b041d31ad35ef87a1\
              2871a5c5e9a6b3bc8e8c3f2eb195d17e2559f38b71cba32337d742d7761f5c","hex"
    Crypto_scrypt_cache[testVector4] = 
      Buffer "731ef3c737b55df4998b44fa8a547a3f38df424da240de389b11d1875ba477672f\
              2fe81b0532b5950e3ea6fff92c65d467aa7d054969821de2344f7a86d42569","hex"
    Crypto_scrypt_cache[testVector5] = 
      Buffer "0478e3e18d96ae2fbe033e3261944670c0ead16336890e4af46f55851ae211d22c\
              97d288383bfd14983e5c574dafeb66f31b16bad037d40a6467019840ffa323","hex"

    # mock used inside parseBIP38toECKey
    spyOn(ImportExport, "Crypto_scrypt").and.callFake(
      (password, salt, N, r, p, dkLen, callback) ->
        keyTest = password + salt.toString("hex") + (N).toString() + 
                  (r).toString() + (p).toString() + (dkLen).toString()
        Image = Crypto_scrypt_cache[keyTest]
        if Image?
          callback Image
        else
          throw "Input not cached in crypto_scrypt mock function"
          callback null        
    )

  # TODO: This is too slow, so we won't test it (for now)    
  # describe "Crypto_scrypt", ->
  #   it "should take a password and salt", ->
  #     observer = 
  #       success: (key) ->
  #         console.log("Success!")
  #         console.log(key) 
  #     spyOn(observer, "success")   
  #     p = 'TestingOneTwoThree'
  #     b = Buffer([233, 87, 162, 74])
  #     ImportExport.Crypto_scrypt(p,b,16384, 8, 8, 64, observer.success)
  #     expect(observer.success).toHaveBeenCalled()
  
  describe "parseBIP38toECKey()", ->
    it "when called with correct password should fire success with the right params", ->
      
      password = "TestingOneTwoThree"
      privKeyStr = "6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg"
      spyOn(observer, "success")
      spyOn(observer, "wrong_password")

      k = Bitcoin.ECKey
            .fromWIF "5KN7MzqK5wt2TP1fQCYyHBtDrXdJuXbUzm4A9rKAteGu3Qi5CVR" 
      k.pub.Q._zInv = k.pub.Q.z.modInverse k.pub.Q.curve.p unless k.pub.Q._zInv?
      ImportExport.parseBIP38toECKey  privKeyStr 
                                     ,password
                                     ,observer.success
                                     ,observer.wrong_password
                                     ,observer.error

      expect(ImportExport.Crypto_scrypt).toHaveBeenCalled()
      expect(observer.success).toHaveBeenCalledWith(k, false);
      expect(observer.wrong_password).not.toHaveBeenCalled()
