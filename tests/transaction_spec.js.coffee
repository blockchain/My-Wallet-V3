# externalAddresses = undefined
# changeAddresses = undefined
activeLegacyAddresses = undefined
defaultSampleTx = undefined

hdAccounts = undefined
  
describe "Transaction", ->  
  beforeEach ->
    defaultSampleTx = 
      'hash': 'b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba'
      'size': 226
      'txIndex': 72945763
      'time': 1419598158
      'inputs': [ {
        'sequence': 4294967295
        'prev_out':
          'spent': true
          'tx_index': 72943968
          'type': 0
          'addr': '1MaCbDwkC74tiEDSnchASxiAARHh94CVSG'
          'value': 140000
          'xpub':
            'path': 'M/1/2'
            'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
          'n': 1
          'script': '76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac'
        'script': '483045022100bb6d6bd543631c2ed603f5e0cdb7e2fe09c04afdf32b4440c7d20a355259aa8b022020ad057e9dc665ef30401994a3c2afcc155e17eb4285aa9ae7b5bf9be3664eb10121029c0283f9e06fd48a44def3f362307284f7433084a440c6523b1a34d097c96fbc'
      } ]
      'out': [
        {
          'spent': false
          'tx_index': 72945763
          'type': 0
          'addr': '1FeerpCgswvGRLVKme759C96DUBtf7SvA2'
          'value': 75196
          'n': 0
          'script': '76a914a0b0c129bb55f8cfade30e02477dc5e504da607388ac'
        }
        {
          'spent': false
          'tx_index': 72945763
          'type': 0
          'addr': '1MaCbDwkC74tiEDSnchASxiAARHh94CVSG'
          'value': 54804
          'xpub':
            'path': 'M/1/2'
            'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
          'n': 1
          'script': '76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac'
        }
      ]
      'result': -85196
      'blockHeight': 335985
      'balance': 1768749
      'account_indexes': [
        0
        0
      ]
      'confirmations': 8
    
    # externalAddreses = []
    # changeAddresses = []
    activeLegacyAddresses = [
      "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
      "14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag"
      "1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX"
      "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
    ]
    
    hdAccounts = [
      {
        getAccountExtendedKey: () -> 
          "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
      }
      {
        getAccountExtendedKey: () -> 
          "xpub6DWoQTdpQcaSm4q9pj9A5EZdCs3NcmM5x8aRoi3VAGXJUCkJhmREWMCaAahs9nhMq7RnseKBV4uwkqCP8g43sEnMXRfFes2BxGagJqZfS5A"
      }
      {
        getAccountExtendedKey: () ->
          "xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ"
      }
    ]
    
    spyOn(MyWallet, "isActiveLegacyAddress").and.callFake((address)->
      activeLegacyAddresses.indexOf(address) > -1
    )

    spyOn(MyWallet, "getAccounts").and.returnValue(hdAccounts)

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
      ##########################################################################
      it "should be recognized", ->
        # TODO: find transaction spent from account to an external address where
        #       a change address was correctly generated
        pending()
      ##########################################################################
      it "should be recognized if sender is change address", ->
        # This shouldn't happen (every tx has a new change address), but we need to be able to process it.
      
        # b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba
        # Sent 0.00075196 BTC from account index 0 to address 1FeerpCgswvGRLVKme759C96DUBtf7SvA2
        #      0.0001 mining fee
        # From address:   1MaCbDwkC74tiEDSnchASxiAARHh94CVSG
        # Change address: 1MaCbDwkC74tiEDSnchASxiAARHh94CVSG 
        tx =
          'hash': 'b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba'
          'size': 226
          'txIndex': 72945763
          'time': 1419598158
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 72943968
              'type': 0
              'addr': '1MaCbDwkC74tiEDSnchASxiAARHh94CVSG'
              'value': 140000
              'xpub':
                'path': 'M/1/2'
                'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
              'n': 1
              'script': '76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac'
            'script': '483045022100bb6d6bd543631c2ed603f5e0cdb7e2fe09c04afdf32b4440c7d20a355259aa8b022020ad057e9dc665ef30401994a3c2afcc155e17eb4285aa9ae7b5bf9be3664eb10121029c0283f9e06fd48a44def3f362307284f7433084a440c6523b1a34d097c96fbc'
          } ]
          'out': [
            {
              'spent': false
              'tx_index': 72945763
              'type': 0
              'addr': '1FeerpCgswvGRLVKme759C96DUBtf7SvA2'
              'value': 75196
              'n': 0
              'script': '76a914a0b0c129bb55f8cfade30e02477dc5e504da607388ac'
            }
            {
              'spent': false
              'tx_index': 72945763
              'type': 0
              'addr': '1MaCbDwkC74tiEDSnchASxiAARHh94CVSG'
              'value': 54804
              'xpub':
                'path': 'M/1/2'
                'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
              'n': 1
              'script': '76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac'
            }
          ]
          'result': -85196
          'blockHeight': 335985
          'balance': 1768749
          'account_indexes': [
            0
            0
          ]
          'confirmations': 8

        transaction =
            'from':
              'account':
                'index': 0
                'amount': 85196
              'legacyAddresses': null
              'externalAddresses': null
            'to':
              'account': null
              'legacyAddresses': null
              'externalAddresses':
                'addressWithLargestOutput': '1FeerpCgswvGRLVKme759C96DUBtf7SvA2'
                'amount': 75196
            'fee': 10000
            'intraWallet': false
            'hash': 'b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba'
            'confirmations': 8
            'txTime': 1419598158
            'note': null
            'tags': []
            'size': 226
            'tx_index': 72945763
            'block_height': 335985
            'result': -85196  

        expect(MyWallet.processTransaction(tx)).toEqual(transaction)
      
      ##########################################################################
      it "should be recognized if there's no change", ->
        # tx where one account address was completely emptied
        # pending()
        tx = 
          'hash': '62636544b31da6a14a419ab1ee3a253bb1ebca65175d351ba4bb54b00b896a87'
          'size': 191
          'txIndex': 79823045
          'time': 1425727751
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 79822173
              'type': 0
              'addr': '1PuxdAtRwPkbFy9M4ete7GZdZmvVWCiSJN'
              'value': 110000
              'xpub':
                'path': 'M/0/3'
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 0
              'script': '76a914fb56d45b9ee3ed21ef7d45b9323e17dcf023afd888ac'
            'script': '47304402203a8c22629e87fd8be70f802977f6d911343f3e333001a30f1bb68ffd92b01f08022019af7f2d8e56922ce65dee249168d095d6d057d1a69393c06c7ee436650a1891012102b37b3c21a106b104d9ac346bd80fd54f4c77930a58cb590c75911d027238ad8a'
          } ]
          'out': [ {
            'spent': false
            'tx_index': 79823045
            'type': 0
            'addr': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
            'value': 100000
            'n': 0
            'script': '76a91477f6416372b875ec857768f6f464323efff129c088ac'
          } ]
          'result': -110000
          'blockHeight': 346553
          'balance': 0
          'account_indexes': [ 0 ]
          'confirmations': 6

        transaction = 
          'from':
            'account':
              'index': 2
              'amount': 110000
            'legacyAddresses': null
            'externalAddresses': null
          'to':
            'account': null
            'legacyAddresses': null
            'externalAddresses':
              'addressWithLargestOutput': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
              'amount': 100000
          'fee': 10000
          'intraWallet': false
          'hash': '62636544b31da6a14a419ab1ee3a253bb1ebca65175d351ba4bb54b00b896a87'
          'confirmations': 6
          'txTime': 1425727751
          'note': null
          'tags': []
          'size': 191
          'tx_index': 79823045
          'block_height': 346553
          'result': -110000

        expect(MyWallet.processTransaction(tx)).toEqual(transaction)

      ##########################################################################
      it "should be recognized if there were multiple input addresses", ->
        tx = 
          'hash': 'f18ad9a8b2c4f7d864b1623d5a826184d2c755834993a9152067d6f4e3311f6d'
          'size': 339
          'txIndex': 79821031
          'time': 1425723873
          'inputs': [
            {
              'sequence': 4294967295
              'prev_out':
                'spent': true
                'tx_index': 79815620
                'type': 0
                'addr': '1JEqeTrUo1nUHosimX8u9kpdkvdom2ekwQ'
                'value': 110000
                'xpub':
                  'path': 'M/0/2'
                  'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
                'n': 0
                'script': '76a914bd182744a3b7da33cd848382bd8b78d0e5901c3688ac'
              'script': '47304402205502e152e38e845ddfc4e94d7cf94a259a00fd99d1fc044820b8bd752b3f734b022070d17c6b105275027d0a6b3c5b10e73b1c7f326e934c4a5691d15e709c5ced1d0121036b586fe3c0bbfb845d767236a7b7db6f3249a74707510871bbd5d29a552beef0'
            }
            {
              'sequence': 4294967295
              'prev_out':
                'spent': true
                'tx_index': 79746098
                'type': 0
                'addr': '1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX'
                'value': 100000
                'xpub':
                  'path': 'M/0/0'
                  'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
                'n': 0
                'script': '76a9148452ffa018aef2c941ed559d0de0132c3f67eebe88ac'
              'script': '4830450221008c81908e2b44541d083d25cd3c5d0d58f77dde15c07fe603ca91b360111f480a02200c8d994d44f15d46495dbcb08e5cd7fa402a57e71d3e48ccfaf250cb5ff64517012102105b66c058566ccbdf2602492d84b960f4dbdd05b860de5e559edc08197eeb8e'
            }
          ]
          'out': [ {
            'spent': false
            'tx_index': 79821031
            'type': 0
            'addr': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
            'value': 200000
            'n': 0
            'script': '76a91477f6416372b875ec857768f6f464323efff129c088ac'
          } ]
          'result': -210000
          'blockHeight': 346547
          'balance': 0
          'account_indexes': [
            0
            0
          ]
          'confirmations': 3

        transaction = 
          'from':
            'account':
              'index': 2
              'amount': 110000
            'legacyAddresses': null
            'externalAddresses':
              'addressWithLargestOutput': '1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX'
              'amount': 100000
          'to':
            'account': null
            'legacyAddresses': null
            'externalAddresses':
              'addressWithLargestOutput': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
              'amount': 200000
          'fee': 10000
          'intraWallet': false
          'hash': 'f18ad9a8b2c4f7d864b1623d5a826184d2c755834993a9152067d6f4e3311f6d'
          'confirmations': 3
          'txTime': 1425723873
          'note': null
          'tags': []
          'size': 339
          'tx_index': 79821031
          'block_height': 346547
          'result': -210000     

        expect(MyWallet.processTransaction(tx)).toEqual(transaction)
        
    describe "from external address to account", ->
      ##########################################################################
      it "should be recognized", ->
        tx =
          'hash': '68ca0a6593f546ab50a41f70b3241795f80d16b8ede7a238f3b9a5b6520f6a6d'
          'size': 225
          'txIndex': 79746098
          'time': 1425659266
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 79692064
              'type': 0
              'addr': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
              'value': 176330919
              'n': 1
              'script': '76a91477f6416372b875ec857768f6f464323efff129c088ac'
            'script': '47304402201e5f48767ce73968fabf6db87297f05c17e48b6b3df709f6fd265d830e391cf1022028f89c3ca371eec7f89d945eeafdbc457696a5235937a5e16021efaed6028367012103296fb539b5de86874336a26b0099250630434073a265e0fba22165aace87db46'
          } ]
          'out': [
            {
              'spent': false
              'tx_index': 79746098
              'type': 0
              'addr': '1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX'
              'value': 100000
              'xpub':
                'path': 'M/0/0'
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 0
              'script': '76a9148452ffa018aef2c941ed559d0de0132c3f67eebe88ac'
            }
            {
              'spent': false
              'tx_index': 79746098
              'type': 0
              'addr': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
              'value': 176220919
              'n': 1
              'script': '76a91477f6416372b875ec857768f6f464323efff129c088ac'
            }
          ]
          'result': 100000
          'blockHeight': 346444
          'balance': 100000
          'account_indexes': [ 0 ]
          'confirmations': 3

        transaction =
          'from':
            'account': null
            'legacyAddresses': null
            'externalAddresses':
              'addressWithLargestOutput': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
              'amount': 100000
          'to':
            'account':
              'index': 2
              'amount': 100000
            'legacyAddresses': null
            'externalAddresses': null
          'fee': 10000
          'intraWallet': false
          'hash': '68ca0a6593f546ab50a41f70b3241795f80d16b8ede7a238f3b9a5b6520f6a6d'
          'confirmations': 3
          'txTime': 1425659266
          'note': null
          'tags': []
          'size': 225
          'tx_index': 79746098
          'block_height': 346444
          'result': 100000

        expect(MyWallet.processTransaction(tx)).toEqual(transaction)
    
    describe "between accounts", ->
      ##########################################################################
      it "should be recognized", ->
        tx =
          'hash': 'eb70c6df08de770782b351c84fb2a96ea100d37ff8edcad579c32c52213c26f7'
          'size': 225
          'txIndex': 72943968
          'time': 1419596460
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 71279770
              'type': 0
              'addr': '1446x39AsPNKeGMKJfLFfboy7TynPNXMwe'
              'value': 250000
              'xpub':
                'path': 'M/0/6'
                'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
              'n': 0
              'script': '76a914217e9754dba345774e0cdf1ebd66a97badf159f788ac'
            'script': '473044022073cdd867c68c5edc805a1bb1cb7682529de8e9eadde28e9160e6a6e1c759b49402203b28d93525aba094722867192f112d64f7aaac6070d9a2dfe1afdb6726f99ac2012103dbe5601359b5096eb1499ac03d801ddc64d5357de486e5765ea1eb8aedcd93a6'
          } ]
          'out': [
            {
              'spent': false
              'tx_index': 72943968
              'type': 0
              'addr': '1MAd443Q6iLPHbyRmiTsqSdRgohiqCg6GL'
              'value': 100000
              'xpub':
                'path': 'M/0/5'
                'm': 'xpub6DWoQTdpQcaSm4q9pj9A5EZdCs3NcmM5x8aRoi3VAGXJUCkJhmREWMCaAahs9nhMq7RnseKBV4uwkqCP8g43sEnMXRfFes2BxGagJqZfS5A'
              'n': 0
              'script': '76a914dd345ac3cbd65e9e108daac72c7ad629fccaff2b88ac'
            }
            {
              'spent': true
              'tx_index': 72943968
              'type': 0
              'addr': '1MaCbDwkC74tiEDSnchASxiAARHh94CVSG'
              'value': 140000
              'xpub':
                'path': 'M/1/2'
                'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
              'n': 1
              'script': '76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac'
            }
          ]
          'result': -10000
          'blockHeight': 335980
          'balance': 1853945
          'account_indexes': [
            0
            1
            0
          ]
          'confirmations': 27

        transaction =
          'from':
            'account':
              'index': 0
              'amount': 110000
            'legacyAddresses': null
            'externalAddresses': null
          'to':
            'account':
              'index': 1
              'amount': 100000
            'legacyAddresses': null
            'externalAddresses': null
          'fee': 10000
          'intraWallet': true
          'hash': 'eb70c6df08de770782b351c84fb2a96ea100d37ff8edcad579c32c52213c26f7'
          'confirmations': 27
          'txTime': 1419596460
          'note': null
          'tags': []
          'size': 225
          'tx_index': 72943968
          'block_height': 335980
          'result': -10000  
        
        expect(MyWallet.processTransaction(tx)).toEqual(transaction)
        
    describe "from legacy address to external address", ->
      ##########################################################################
      it "should be recognized", ->
        # 391cfffa273d82866b367af7941fb3aca35b5a1a95003140a148166bf5d02ee8
        # sent 0.0002, with 0.0007 of change and 0.0001 for the miners
        tx =
          'hash': '391cfffa273d82866b367af7941fb3aca35b5a1a95003140a148166bf5d02ee8'
          'size': 257
          'txIndex': 72943525
          'time': 1419595953
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 72943487
              'type': 0
              'addr': '1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h'
              'value': 100000
              'n': 0
              'script': '76a914078d35591e340799ee96968936e8b2ea8ce504a688ac'
            'script': '4730440220365779bbc2b5f83d575f32a0bdc01630aff96d71d1845fad5f55d91f1012a3b4022068993156c45fd5ac779a5eed6848cd6acc26490ba0cbbc1362403437de945b20014104748bed81c1f6c72a63d2e9d39756ec17488cd5298f53f87dcbcb2bc6ea5e4bd046336d7411c16e08c00390481d67dc448535596ac7361159f359ca357a7da2ee'
          } ]
          'out': [
            {
              'spent': false
              'tx_index': 72943525
              'type': 0
              'addr': '1FeerpCgswvGRLVKme759C96DUBtf7SvA2'
              'value': 20000
              'n': 0
              'script': '76a914a0b0c129bb55f8cfade30e02477dc5e504da607388ac'
            }
            {
              'spent': false
              'tx_index': 72943525
              'type': 0
              'addr': '1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h'
              'value': 70000
              'n': 1
              'script': '76a914078d35591e340799ee96968936e8b2ea8ce504a688ac'
            }
          ]
          'result': -30000
          'blockHeight': 335980
          'balance': 1863945
          'account_indexes': []
          'confirmations': 37

        transaction =
          'from':
            'account': null
            'legacyAddresses': [ {
              'address': '1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h'
              'amount': 30000
            } ]
            'externalAddresses': null
          'to':
            'account': null
            'legacyAddresses': []
            'externalAddresses':
              'addressWithLargestOutput': '1FeerpCgswvGRLVKme759C96DUBtf7SvA2'
              'amount': 20000
          'fee': 10000
          'intraWallet': false
          'hash': '391cfffa273d82866b367af7941fb3aca35b5a1a95003140a148166bf5d02ee8'
          'confirmations': 37
          'txTime': 1419595953
          'note': null
          'tags': []
          'size': 257
          'tx_index': 72943525
          'block_height': 335980
          'result': -30000
        
        result = MyWallet.processTransaction(tx)
        
        expect(result["from"]).toEqual(transaction["from"]) # Amount should be ex. change
        expect(result["to"]).toEqual(transaction["to"]) # It shouldn't include the change
        
    describe "between legacy addresses", ->
      ##########################################################################
      it "...", ->
        pending()
        
    describe "from legacy address to account", ->
      ##########################################################################
      it "should be recognized", ->
        tx = 
          'hash': '6c3224f1bd35ec8e57fc8494c65f6964ba4eec8eba1a1b6c77410a480cba6a01'
          'size': 257
          'txIndex': 80026565
          'time': 1425915550
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 80012356
              'type': 0
              'addr': '1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF'
              'value': 100000
              'n': 0
              'script': '76a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac'
            'script': '47304402200b6456e842e53fd8aafb2d2e17b22b93eae657c8d3be70e044920ccc788b6ff002202355b990ef026d1d25c16158ceeeb22718752a7aceead065aeaa7bdc0a4c9d93014104be6fba00626de654c2992f4e35d03cacd8685ee723e94262c57ebd3113c0b7d6742316b6aa9438a1ebebfbe5979a3a0e22d1b96a7d83703b2ee23fc22f9ce7e8'
          } ]
          'out': [
            {
              'spent': false
              'tx_index': 80026565
              'type': 0
              'addr': '1G17iiPgRyYz6mV1Wtc6w1Spjc8svYDeZC'
              'value': 60000
              'xpub':
                'path': 'M/0/5'
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 0
              'script': '76a914a48f7ee3c3cc27562c196679cad8c38c75ef46fd88ac'
            }
            {
              'spent': false
              'tx_index': 80026565
              'type': 0
              'addr': '1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF'
              'value': 30000
              'n': 1
              'script': '76a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac'
            }
          ]
          'result': -10000
          'blockHeight': null
          'balance': 120000
          'account_indexes': [ 0 ]
          'confirmations': 0

        transaction = 
          'from':
            'account': null
            'legacyAddresses': [ {
              'address': '1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF'
              'amount': 70000
            } ]
            'externalAddresses': null
          'to':
            'account':
              'index': 2
              'amount': 60000
            'legacyAddresses': []
            'externalAddresses': null
          'fee': 40000
          'intraWallet': true
          'hash': '6c3224f1bd35ec8e57fc8494c65f6964ba4eec8eba1a1b6c77410a480cba6a01'
          'confirmations': 0
          'txTime': 1425915550
          'note': null
          'tags': []
          'size': 257
          'tx_index': 80026565
          'block_height': null
          'result': -10000

        expect(MyWallet.processTransaction(tx)).toEqual(transaction)
        
    describe "from account to legacy address", ->
      ##########################################################################
      it "should be recognized", ->
        tx = 
          'hash': '9d470a7518f3f98b865f2c68f4a39f64138fc61807ba4168764b104798800911'
          'size': 226
          'txIndex': 80021322
          'time': 1425912653
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 80022351
              'type': 0
              'addr': '1LsY1aj5PfnrH9EJg3zyRw5cu26E77ZyoE'
              'value': 100000
              'xpub':
                'path': 'M/0/4'
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 0
              'script': '76a914d9f912e7a05c413cb887f752cbc30a606898512888ac'
            'script': '483045022100ecf7f6f74fa2a1ed815f66e1d7af7bc5c9bdfaa7b3ac16116d678ddfe3df164e022026a1ce2395d157a48070398b57696c8339a535b97f86993881624ee0a498663b012103a5b4b1010b03bf21632efc7e6d96bad9553ee121330bc5cffce69ebbe034f007'
          } ]
          'out': [
            {
              'spent': false
              'tx_index': 80021322
              'type': 0
              'addr': '1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX'
              'value': 50000
              'n': 0
              'script': '76a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac'
            }
            {
              'spent': false
              'tx_index': 80021322
              'type': 0
              'addr': '1LoQJ2ZVxqe669WcTNeF7MzWcA9sS3fguQ'
              'value': 40000
              'xpub':
                'path': 'M/1/0'
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 1
              'script': '76a914d930f7f7cbfde68eb30d1a6b5efc6d368c1b78a588ac'
            }
          ]
          'result': -10000
          'blockHeight': 346868
          'balance': 190000
          'account_indexes': [
            0
            0
          ]
          'confirmations': 0

        transaction = 
          'from':
            'account':
              'index': 2
              'amount': 60000
            'legacyAddresses': null
            'externalAddresses': null
          'to':
            'account': null
            'legacyAddresses': [ {
              'address': '1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX'
              'amount': 50000
            } ]
            'externalAddresses': null
          'fee': 10000
          'intraWallet': true
          'hash': '9d470a7518f3f98b865f2c68f4a39f64138fc61807ba4168764b104798800911'
          'confirmations': 0
          'txTime': 1425912653
          'note': null
          'tags': []
          'size': 226
          'tx_index': 80021322
          'block_height': 346868
          'result': -10000

        expect(MyWallet.processTransaction(tx)).toEqual(transaction)
        
    describe "from external address to legacy address", ->
      ##########################################################################
      it "should be recoginized", ->
        # 1ae6e674f0ea63284ea471f2809f5c84574237d589e16eee356c76d691fe9272
        # received 0.00040959 from 18xLMRUADGRgty6gjmSZyeKZzALCXHY6AS
        # 0.03237531 BTC change went to another address (not ours)
        # 14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag is a legacy address in our wallet    
        tx =
          'hash': '1ae6e674f0ea63284ea471f2809f5c84574237d589e16eee356c76d691fe9272'
          'size': 226
          'txIndex': 74018824
          'time': 1420717021
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 73952909
              'type': 0
              'addr': '18xLMRUADGRgty6gjmSZyeKZzALCXHY6AS'
              'value': 3288490
              'n': 1
              'script': '76a914573fe9a70f096cd747f076a9323f453c9114ad7988ac'
            'script': '483045022100d183490a2e9e978a0deb4fe06cd54211904aebbe8b6b3fbb1c5f2fd847655ab502203dffa200b1419b3a083f8b430e2be25fe8b0eff80d74707104c4ceaf272ab1a601210250f530ecfcb81861cd48a8849db546c48f1fad45377fcf33189e733c3024d6a0'
          } ]
          'out': [
            {
              'spent': false
              'tx_index': 74018824
              'type': 0
              'addr': '14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag'
              'value': 40959
              'n': 0
              'script': '76a9142965226ca41acdf2810f0fc1b713f34c2e3df50b88ac'
            }
            {
              'spent': false
              'tx_index': 74018824
              'type': 0
              'addr': '18vv58P4CGrYtWvBCgwgaQtCWpTq1DTtgV'
              'value': 3237531
              'n': 1
              'script': '76a91456fb3a60720447d1e559a4f32fc32d96fb34804a88ac'
            }
          ]
          'result': 40959
          'blockHeight': 338047
          'balance': 1585720
          'account_indexes': []
          'confirmations': 25

        transaction =
          'from':
            'account': null
            'legacyAddresses': null
            'externalAddresses':
              'addressWithLargestOutput': '18xLMRUADGRgty6gjmSZyeKZzALCXHY6AS'
              'amount': 40959
          'to':
            'account': null
            'legacyAddresses': [ {
              'address': '14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag'
              'amount': 40959
            } ]
            'externalAddresses': null
          'fee': 10000
          'intraWallet': false
          'hash': '1ae6e674f0ea63284ea471f2809f5c84574237d589e16eee356c76d691fe9272'
          'confirmations': 25
          'txTime': 1420717021
          'note': null
          'tags': []
          'size': 226
          'tx_index': 74018824
          'block_height': 338047
          'result': 40959

        result = MyWallet.processTransaction(tx)
        
        expect(result["from"]).toEqual(transaction["from"]) # Amount should be ex. change
        expect(result["to"]).toEqual(transaction["to"]) # It shouldn't include the change
    
    describe "confirmations", ->
      ##########################################################################
      it "should be fetched via getConfirmationsForTx()", ->
        MyWallet.processTransaction(defaultSampleTx)
        expect(MyWallet.getConfirmationsForTx).toHaveBeenCalled()    

  describe "getConfirmationsForTx()", ->
    ##########################################################################
    it "...", ->
      pending()
      
