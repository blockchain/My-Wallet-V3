describe "BIP38", ->
  it "Empty test should work", ->
    observer = 
      success: (key) ->
        console.log(key)

    password = "TestingOneTwoThree"
    privKeyStr = "6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg"
    spyOn(observer, "success")
    ImportExport.parseBIP38toECKey(password, privKeyStr, observer.success)
    expect(observer.success).toHaveBeenCalled()