proxyquire = require('proxyquireify')(require)

stubs =
  './wallet':
     get_history: () ->

BlockchainAPI = proxyquire('../src/blockchain-api', stubs)


describe "BlockchainAPI", ->
  beforeEach ->
    window.karma = true
    
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
          toBuffer: () -> new Buffer(0)
        }, 
        null, 
        observer.success, 
        observer.error
      )

      expect(observer.success).toHaveBeenCalledWith("1234")
