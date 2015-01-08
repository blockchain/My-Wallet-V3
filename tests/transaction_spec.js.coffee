# externalAddresses = undefined
# changeAddresses = undefined
activeLegacyAddresses = undefined
defaultSampleTx = undefined

hdAccounts = undefined
  
describe "Transaction", ->  
  beforeEach ->
    defaultSampleTx = {"hash":"b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba","size":226,"txIndex":72945763,"time":1419598158,"inputs":[{"sequence":4294967295,"prev_out":{"spent":true,"tx_index":72943968,"type":0,"addr":"1MaCbDwkC74tiEDSnchASxiAARHh94CVSG","value":140000,"xpub":{"path":"M/1/2","m":"xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"},"n":1,"script":"76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac"},"script":"483045022100bb6d6bd543631c2ed603f5e0cdb7e2fe09c04afdf32b4440c7d20a355259aa8b022020ad057e9dc665ef30401994a3c2afcc155e17eb4285aa9ae7b5bf9be3664eb10121029c0283f9e06fd48a44def3f362307284f7433084a440c6523b1a34d097c96fbc"}],"out":[{"spent":false,"tx_index":72945763,"type":0,"addr":"1FeerpCgswvGRLVKme759C96DUBtf7SvA2","value":75196,"n":0,"script":"76a914a0b0c129bb55f8cfade30e02477dc5e504da607388ac"},{"spent":false,"tx_index":72945763,"type":0,"addr":"1MaCbDwkC74tiEDSnchASxiAARHh94CVSG","value":54804,"xpub":{"path":"M/1/2","m":"xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"},"n":1,"script":"76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac"}],"result":-85196,"blockHeight":335985,"balance":1768749,"account_indexes":[0,0],"confirmations":8}

    
    # externalAddreses = []
    # changeAddresses = []
    activeLegacyAddresses = ["1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h", "14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag"]
    
    hdAccounts = [
      {
        getAccountExtendedKey: () -> 
          "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
      }
      {
        getAccountExtendedKey: () -> 
          "xpub6DWoQTdpQcaSm4q9pj9A5EZdCs3NcmM5x8aRoi3VAGXJUCkJhmREWMCaAahs9nhMq7RnseKBV4uwkqCP8g43sEnMXRfFes2BxGagJqZfS5A"
      }
    ]
    
    spyOn(MyWallet, "isActiveLegacyAddress").and.callFake((address)->
      activeLegacyAddresses.indexOf(address) > -1
    )
    
    spyOn(MyWallet, "getHDWallet").and.returnValue({
      getAccounts: () -> hdAccounts
      getAccount: (idx) ->  hdAccounts[idx]
    })
    
    spyOn(MyWallet, "getConfirmationsForTx").and.callFake((block, tx)->
      tx.confirmations
    )
    
    spyOn(MyWallet, "getLatestBlock").and.returnValue(true)
        
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
    
      it "should be recognized if there were multiple input addresses", ->
        # TODO: find tx where multiple addresses within the account were used to spend
        pending()
        
    describe "from external address to account", ->
      it "...", ->
        pending()
    
    describe "between accounts", ->
      it "should be recognized", ->
        tx = {"hash":"eb70c6df08de770782b351c84fb2a96ea100d37ff8edcad579c32c52213c26f7","size":225,"txIndex":72943968,"time":1419596460,"inputs":[{"sequence":4294967295,"prev_out":{"spent":true,"tx_index":71279770,"type":0,"addr":"1446x39AsPNKeGMKJfLFfboy7TynPNXMwe","value":250000,"xpub":{"path":"M/0/6","m":"xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"},"n":0,"script":"76a914217e9754dba345774e0cdf1ebd66a97badf159f788ac"},"script":"473044022073cdd867c68c5edc805a1bb1cb7682529de8e9eadde28e9160e6a6e1c759b49402203b28d93525aba094722867192f112d64f7aaac6070d9a2dfe1afdb6726f99ac2012103dbe5601359b5096eb1499ac03d801ddc64d5357de486e5765ea1eb8aedcd93a6"}],"out":[{"spent":false,"tx_index":72943968,"type":0,"addr":"1MAd443Q6iLPHbyRmiTsqSdRgohiqCg6GL","value":100000,"xpub":{"path":"M/0/5","m":"xpub6DWoQTdpQcaSm4q9pj9A5EZdCs3NcmM5x8aRoi3VAGXJUCkJhmREWMCaAahs9nhMq7RnseKBV4uwkqCP8g43sEnMXRfFes2BxGagJqZfS5A"},"n":0,"script":"76a914dd345ac3cbd65e9e108daac72c7ad629fccaff2b88ac"},{"spent":true,"tx_index":72943968,"type":0,"addr":"1MaCbDwkC74tiEDSnchASxiAARHh94CVSG","value":140000,"xpub":{"path":"M/1/2","m":"xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"},"n":1,"script":"76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac"}],"result":-10000,"blockHeight":335980,"balance":1853945,"account_indexes":[0,1,0],"confirmations":27}
        transaction = {"from":{"account":{"index":0,"amount":110000},"legacyAddresses":null,"externalAddresses":null},"to":{"account":{"index":1,"amount":100000},"legacyAddresses":null,"externalAddresses":null},"fee":10000,"intraWallet":true,"hash":"eb70c6df08de770782b351c84fb2a96ea100d37ff8edcad579c32c52213c26f7","confirmations":27,"txTime":1419596460,"note":null,"tags":[],"size":225,"tx_index":72943968,"block_height":335980,"result":-10000}
        
        expect(MyWallet.processTransaction(tx)).toEqual(transaction)
        
    describe "from legacy address to external address", ->
      it "should be recognized", ->
        # 391cfffa273d82866b367af7941fb3aca35b5a1a95003140a148166bf5d02ee8
        # sent 0.0002, with 0.0007 of change and 0.0001 for the miners
        tx = {"hash":"391cfffa273d82866b367af7941fb3aca35b5a1a95003140a148166bf5d02ee8","size":257,"txIndex":72943525,"time":1419595953,"inputs":[{"sequence":4294967295,"prev_out":{"spent":true,"tx_index":72943487,"type":0,"addr":"1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h","value":100000,"n":0,"script":"76a914078d35591e340799ee96968936e8b2ea8ce504a688ac"},"script":"4730440220365779bbc2b5f83d575f32a0bdc01630aff96d71d1845fad5f55d91f1012a3b4022068993156c45fd5ac779a5eed6848cd6acc26490ba0cbbc1362403437de945b20014104748bed81c1f6c72a63d2e9d39756ec17488cd5298f53f87dcbcb2bc6ea5e4bd046336d7411c16e08c00390481d67dc448535596ac7361159f359ca357a7da2ee"}],"out":[{"spent":false,"tx_index":72943525,"type":0,"addr":"1FeerpCgswvGRLVKme759C96DUBtf7SvA2","value":20000,"n":0,"script":"76a914a0b0c129bb55f8cfade30e02477dc5e504da607388ac"},{"spent":false,"tx_index":72943525,"type":0,"addr":"1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h","value":70000,"n":1,"script":"76a914078d35591e340799ee96968936e8b2ea8ce504a688ac"}],"result":-30000,"blockHeight":335980,"balance":1863945,"account_indexes":[],"confirmations":37}
        transaction = {
          "from":{
            "account":null,
            "legacyAddresses":[{"address":"1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h","amount":30000}]
            ,"externalAddresses":null
          },
          "to":{
            "account":null,
            "legacyAddresses":[],
            "externalAddresses":{"addressWithLargestOutput":"1FeerpCgswvGRLVKme759C96DUBtf7SvA2","amount":20000}
          },
          "fee":10000,
          "intraWallet":false,
          "hash":"391cfffa273d82866b367af7941fb3aca35b5a1a95003140a148166bf5d02ee8",
          "confirmations":37,"txTime":1419595953,"note":null,"tags":[],"size":257,"tx_index":72943525,"block_height":335980,"result":-30000}
        
        result = MyWallet.processTransaction(tx)
        
        expect(result["from"]).toEqual(transaction["from"]) # Amount should be ex. change
        expect(result["to"]).toEqual(transaction["to"]) # It shouldn't include the change
        
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
      it "should be recoginized", ->
        # 1ae6e674f0ea63284ea471f2809f5c84574237d589e16eee356c76d691fe9272
        # received 0.00040959 from 18xLMRUADGRgty6gjmSZyeKZzALCXHY6AS
        # 0.03237531 BTC change went to another address (not ours)
        # 14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag is a legacy address in our wallet
        
        tx = {"hash":"1ae6e674f0ea63284ea471f2809f5c84574237d589e16eee356c76d691fe9272","size":226,"txIndex":74018824,"time":1420717021,"inputs":[{"sequence":4294967295,"prev_out":{"spent":true,"tx_index":73952909,"type":0,"addr":"18xLMRUADGRgty6gjmSZyeKZzALCXHY6AS","value":3288490,"n":1,"script":"76a914573fe9a70f096cd747f076a9323f453c9114ad7988ac"},"script":"483045022100d183490a2e9e978a0deb4fe06cd54211904aebbe8b6b3fbb1c5f2fd847655ab502203dffa200b1419b3a083f8b430e2be25fe8b0eff80d74707104c4ceaf272ab1a601210250f530ecfcb81861cd48a8849db546c48f1fad45377fcf33189e733c3024d6a0"}],"out":[{"spent":false,"tx_index":74018824,"type":0,"addr":"14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag","value":40959,"n":0,"script":"76a9142965226ca41acdf2810f0fc1b713f34c2e3df50b88ac"},{"spent":false,"tx_index":74018824,"type":0,"addr":"18vv58P4CGrYtWvBCgwgaQtCWpTq1DTtgV","value":3237531,"n":1,"script":"76a91456fb3a60720447d1e559a4f32fc32d96fb34804a88ac"}],"result":40959,"blockHeight":338047,"balance":1585720,"account_indexes":[],"confirmations":25}

        transaction = {
          "from":{
            "account":null,
            "legacyAddresses":null,
            "externalAddresses":{"addressWithLargestOutput":"18xLMRUADGRgty6gjmSZyeKZzALCXHY6AS","amount":40959}
          },
          "to":{
            "account":null,
            "legacyAddresses":[{"address":"14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag","amount":40959}],
            "externalAddresses": null
          },"fee":10000,"intraWallet":false,"hash":"1ae6e674f0ea63284ea471f2809f5c84574237d589e16eee356c76d691fe9272","confirmations":25,"txTime":1420717021,"note":null,"tags":[],"size":226,"tx_index":74018824,"block_height":338047,
          "result":40959
        }

        result = MyWallet.processTransaction(tx)
        
        expect(result["from"]).toEqual(transaction["from"]) # Amount should be ex. change
        expect(result["to"]).toEqual(transaction["to"]) # It shouldn't include the change
    
    describe "confirmations", ->
      it "should be fetched via getConfirmationsForTx()", ->
        MyWallet.processTransaction(defaultSampleTx)
        expect(MyWallet.getConfirmationsForTx).toHaveBeenCalled()    

  describe "getConfirmationsForTx()", ->
    it "...", ->
      pending()
      