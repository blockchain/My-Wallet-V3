describe "BlockchainAPI", ->
  beforeEach ->
    window.karma = true
    
    spyOn(MyWallet, "sendEvent").and.callFake(
      ()->
    )
    
    spyOn(MyWallet, "get_history").and.callFake(
      ()->
    )
    
  describe "push_tx", ->
    it "should pass transaction hash to success callback", ->
      spyOn($, "ajax").and.callFake(
        (post)->
          post.success(post.data.hash)
      )
      
      observer = 
        success: (tx_hash) ->
        error: () ->
      
      spyOn(observer, "success")
          
      BlockchainAPI.push_tx(
        {
          getId: () -> "1234"
          toHex: () -> ""
        }, 
        null, 
        observer.success, 
        observer.error
      )

      expect(observer.success).toHaveBeenCalledWith("1234")