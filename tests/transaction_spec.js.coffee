externalAddresses = undefined
changeAddresses = undefined
activeLegacyAddresses = undefined

hdAccounts = undefined
  
describe "Transaction", ->  
  beforeEach ->
    externalAddreses = ["1MaCbDwkC74tiEDSnchASxiAARHh94CVSG"]
    changeAddresses = []
    activeLegacyAddresses = []
    
    hdAccounts = [
      {
        getAccountExtendedKey: () -> 
          "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
      }
    ]
    
    spyOn(MyWallet, "isActiveLegacyAddress").and.callFake((address)->
      activeLegacyAddresses.indexOf(address) > -1
    )
    
    spyOn(MyWallet, "getHDWallet").and.returnValue({
      getAccounts: () -> hdAccounts
      getAccount: (idx) ->  hdAccounts[idx]
    })
        
    # Terminology:
    # account: an HD wallet account (which has external and change addresses)
    # legacy address: an non-HD address for which we have the private key or a watch-only address
    # external address: an address outside our wallet (not to be confused with "external address" inside an HD account)
    
  describe "processTransaction()", ->
    beforeEach ->
      spyOn(MyWallet, "getTags").and.returnValue([])
    
    describe "from account to external address", ->
      it "should be recognized", ->
        # TODO: find transaction spent from account to an external address where
        #       a change address was correctly generated
        pending()
      
      it "should be recognized if sender is change address", ->
        # This shouldn't happen (every tx has a new change address), but we need to be able to process it.
      
        # b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba
        # Sent 0.00075196 BTC from account index 0 to address 1FeerpCgswvGRLVKme759C96DUBtf7SvA2
        #      0.0001 mining fee
        # From address:   1MaCbDwkC74tiEDSnchASxiAARHh94CVSG
        # Change address: 1MaCbDwkC74tiEDSnchASxiAARHh94CVSG 

        tx = {"hash":"b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba","size":226,"txIndex":72945763,"time":1419598158,"inputs":[{"sequence":4294967295,"prev_out":{"spent":true,"tx_index":72943968,"type":0,"addr":"1MaCbDwkC74tiEDSnchASxiAARHh94CVSG","value":140000,"xpub":{"path":"M/1/2","m":"xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"},"n":1,"script":"76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac"},"script":"483045022100bb6d6bd543631c2ed603f5e0cdb7e2fe09c04afdf32b4440c7d20a355259aa8b022020ad057e9dc665ef30401994a3c2afcc155e17eb4285aa9ae7b5bf9be3664eb10121029c0283f9e06fd48a44def3f362307284f7433084a440c6523b1a34d097c96fbc"}],"out":[{"spent":false,"tx_index":72945763,"type":0,"addr":"1FeerpCgswvGRLVKme759C96DUBtf7SvA2","value":75196,"n":0,"script":"76a914a0b0c129bb55f8cfade30e02477dc5e504da607388ac"},{"spent":false,"tx_index":72945763,"type":0,"addr":"1MaCbDwkC74tiEDSnchASxiAARHh94CVSG","value":54804,"xpub":{"path":"M/1/2","m":"xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"},"n":1,"script":"76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac"}],"result":-85196,"blockHeight":335985,"balance":1768749,"account_indexes":[0,0],"confirmations":8}
        transaction = {"from":{"account":{"index":0,"amount":85196},"legacyAddresses":null,"externalAddresses":null},"to":{"account":null,"legacyAddresses":null,"externalAddresses":{"addressWithLargestOutput":"1FeerpCgswvGRLVKme759C96DUBtf7SvA2","amount":75196}},"fee":10000,"intraWallet":false,"hash":"b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba","confirmations":8,"txTime":1419598158,"note":null,"tags":[],"size":226,"tx_index":72945763,"block_height":335985,"result":-85196}
      
        expect(MyWallet.processTransaction(tx)).toEqual(transaction)
      
      it "should be recognized if there's no change", ->
        # TODO: find tx where one account address was completely emptied
        pending()
    
      it "should be recorgnized if there were multiple input addresses", ->
        # TODO: find tx where multiple addresses within the account were used to spend
        pending()
        
    describe "from external address to account", ->
      it "...", ->
        pending()
    
    describe "between accounts", ->
      it "...", ->
        pending()
        
    describe "from legacy address to external address", ->
      it "...", ->
        pending()
        
    describe "between legacy addresses", ->
      it "...", ->
        pending()
        
    describe "from legacy address to account", ->
      it "...", ->
        pending()
        
    describe "from account to legacy address", ->
      it "...", ->
        pending()
        
    describe "from external address to legacy address", ->
      it "...", ->
        pending()
        
    

    