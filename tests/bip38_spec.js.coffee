describe "BIP38", ->
  beforeEach ->
    # overrride as a temporary solution
    window.setTimeout = (myFunction) -> myFunction()

    # mock used inside parseBIP38toECKey
    spyOn(ImportExport, "Crypto_scrypt").and.callFake(
      (password, salt, N, r, p, dkLen, callback) ->
        keyTest = password + 
                  salt.toString() + 
                  (N).toString() + 
                  (r).toString() + 
                  (p).toString() + 
                  (dkLen).toString()
        # preimages
        testVector1 = "TestingOneTwoThree" + 
                      # this is the addrhash computed inside parseBIP38toECKey
                      Buffer([233, 87, 162, 74]).toString() + 
                      (16384).toString() + 
                      (8).toString() + 
                      (8).toString() + 
                      (64).toString()
        # images
        fcached = {}
        fcached[testVector1] = Buffer([248, 118, 72, 166, 180, 47, 221, 134, 
                                       239, 104, 55, 162, 73, 205, 225, 83, 
                                       24, 242, 100, 212, 58, 133, 155, 97, 
                                       14, 120, 234, 99, 213, 28, 178, 211, 
                                       230, 11, 244, 75, 251, 41, 213, 67, 
                                       187, 162, 74, 252, 204, 250, 219, 252, 
                                       110, 249, 49, 47, 204, 207, 88, 159, 
                                       165, 234, 19, 102, 236, 33, 228, 192])
        fImage = fcached[keyTest]
        if fImage?
          callback fImage
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
      observer = 
        success: (key) ->
          console.log("Success!")
          console.log(key)
        wrong_password: () ->
          console.log("Wrong password!")
        error: (err) ->
          console.log("Some error")
          console.log(err)

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
