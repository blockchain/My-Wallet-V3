describe "BIP38", ->
  beforeEach ->
    spyOn(CryptoJS.AES, "decrypt").andCallFake((param1, param2, success)->
      if param1 == "..."
        success("real value")
    )
    
  describe "Crypto_scrypt", ->
    it "...", ->
      ImportExport.Crypto_scrypt
  
  describe "parseBIP38toECKey()", ->
    it "Empty test should work", ->
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
      ImportExport.parseBIP38toECKey(privKeyStr, password, observer.success)
      expect(observer.success).toHaveBeenCalled()
    
    
