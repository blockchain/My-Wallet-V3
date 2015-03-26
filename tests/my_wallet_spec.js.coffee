describe "createAccount", ->
  observer = undefined
  
  beforeEach ->    
    observer = 
      success:  () ->
      error: () ->
        
    MyWallet.deleteHDWallet()
    MyWallet.setDoubleEncryption(false)

    hdWallet = new HDWallet(seed, null, null)
  
    spyOn(MyWallet, "getHDWallet").and.returnValue(hdWallet)
    
    spyOn(MyWallet, 'backupWallet').and.callFake(() -> )
    spyOn(MyWallet, 'backupWalletDelayed').and.callFake(() -> )
    spyOn(MyWallet, 'listenToHDWalletAccount').and.callFake(() -> )
    
    spyOn(observer, "success")
    spyOn(observer, "error")
  
  it "should not allow up to 17 characters", ->
    account = MyWallet.createAccount("12345678901234567", null, observer.success, observer.error)
    expect(observer.success).toHaveBeenCalled()
    expect(observer.error).not.toHaveBeenCalled()
    
  it "should not allow more than 17 characters", ->      
    account = MyWallet.createAccount("123456789012345678", null, observer.success, observer.error)
    expect(observer.success).not.toHaveBeenCalled()
    expect(observer.error).toHaveBeenCalled()
    
# Rename account