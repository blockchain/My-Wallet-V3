proxyquire = require('proxyquireify')(require)

WalletStore = {}

stubs = { './wallet-store': WalletStore }

MyWallet = proxyquire('../src/wallet', stubs)

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
            'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQML\
                  E4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
          'n': 1
          'script': '76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac'
        'script': '483045022100bb6d6bd543631c2ed603f5e0cdb7e2fe09c04afdf32b4440\
                   c7d20a355259aa8b022020ad057e9dc665ef30401994a3c2afcc155e17eb\
                   4285aa9ae7b5bf9be3664eb10121029c0283f9e06fd48a44def3f3623072\
                   84f7433084a440c6523b1a34d097c96fbc'
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
            'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQML\
                  E4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
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

    hdAccounts = [
      {
        extendedPublicKey:
          "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZ\
           HSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
        active: true
      }
      {
        extendedPublicKey:
          "xpub6DWoQTdpQcaSm4q9pj9A5EZdCs3NcmM5x8aRoi3VAGXJUCkJhmREWMCaAahs9nhM\
           q7RnseKBV4uwkqCP8g43sEnMXRfFes2BxGagJqZfS5A"
        active: true
      }
      {
        extendedPublicKey:
          "xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZk\
           LjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ"
        active: true
      }
    ]
    
    MyWallet.wallet = 
      activeKey: (key) ->
        return [
          "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
          "1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX"
          "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
          "14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag"
        ].indexOf(key) > -1
      hdwallet:
        accounts: hdAccounts
      getPaidTo: () -> {}
      getNote: () -> ""
    
    spyOn(WalletStore, "getLatestBlock").and.returnValue(true)

    # Terminology:
    # account: an HD wallet account (which has external and change addresses)
    # legacy address: an non-HD address for which we have
    #                 the private key or a watch-only address
    # external address: an address outside our wallet (not to be confused
    #                   with "external address" inside an HD account)

  describe "processTransaction()", ->
    beforeEach ->
      # spyOn(WalletStore, "getTags").and.returnValue([])

      spyOn(MyWallet, "getConfirmationsForTx").and.callFake(
        (block, tx)-> tx.confirmations
      )

    describe "from account to external address", ->

      tx = undefined
      transaction = undefined

      beforeEach ->
        tx =
          'hash': 'cfb77ea99f7d97e551afae96e1fe028e56933621d8cc4342b399fba03bfe8826'
          'size': 226
          'txIndex': 80064446
          'time': 1425942592
          'inputs': [ {
            'sequence': 4294967295
            'prev_out':
              'spent': true
              'tx_index': 80026565
              'type': 0
              'addr': '1G17iiPgRyYz6mV1Wtc6w1Spjc8svYDeZC'
              'value': 60000
              'xpub':
                'path': 'M/0/5'
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9G\
                      f9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 0
              'script': '76a914a48f7ee3c3cc27562c196679cad8c38c75ef46fd88ac'
            'script': '483045022100a6a6cc37ff7995b90468ef17b38ab601e388ec270490\
                       97830c84bd0005aab312022003bbf361181ab25f64bdca9ea48b2a1c\
                       64c735b93b126e3178ae9d059ac06f5b012103fd78acfd990b9891c5\
                       cc09a8a7d912859f96ac896987cd23ce09fc62f03bb44e'
          } ]
          'out': [
            {
              'spent': false
              'tx_index': 80064446
              'type': 0
              'addr': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
              'value': 30000
              'n': 0
              'script': '76a91477f6416372b875ec857768f6f464323efff129c088ac'
            }
            {
              'spent': false
              'tx_index': 80064446
              'type': 0
              'addr': '1MrLgA3A65AXNdAEHBLC2qCLHQ24oZzBeJ'
              'value': 20000
              'xpub':
                'path': 'M/1/1'
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9G\
                      f9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 1
              'script': '76a914e4b7525e31d7aea0157581ff640a04d27be9067188ac'
            }
          ]
          'result': -40000
          'blockHeight': 346920
          'balance': 130000
          'account_indexes': [
            0
            0
          ]
          'confirmations': 71

        transaction =
          'from':
            'account':
              'index': 2
              'amount': 40000
            'legacyAddresses': null
            'externalAddresses': null
          'to':
            'account': null
            'legacyAddresses': null
            'externalAddresses': [
              'address': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
              'amount': 30000
            ]
            'email': null
            'mobile': null
          'fee': 10000
          'intraWallet': false
          'hash': 'cfb77ea99f7d97e551afae96e1fe028e56933621d8cc4342b399fba03bfe8826'
          'confirmations': 71
          'txTime': 1425942592
          'publicNote': null
          'note': null
          'tags': []
          'size': 226
          'tx_index': 80064446
          'block_height': 346920
          'result': -40000


      it "should recognize from account", ->
        expect(MyWallet.processTransaction(tx).from).toEqual(transaction.from)

      it "should recognize to address", ->
        expect(MyWallet.processTransaction(tx).to).toEqual(transaction.to)

      it "should have the correct amount", ->
        expect(MyWallet.processTransaction(tx).result).toEqual(transaction.result)

      it "should not be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(false)

      ##########################################################################
      describe "if sender is change address", ->
        # This shouldn't happen (every tx has a new change address), but we
        # need to be able to process it.

        # b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba
        # Sent 0.00075196 BTC from account index 0
        #   to address 1FeerpCgswvGRLVKme759C96DUBtf7SvA2
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
                'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpN\
                      sQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
              'n': 1
              'script': '76a914e1a9ead4802fa084d8c8de33c0acd0238fced51888ac'
            'script': '483045022100bb6d6bd543631c2ed603f5e0cdb7e2fe09c04afdf32b\
                       4440c7d20a355259aa8b022020ad057e9dc665ef30401994a3c2afcc\
                       155e17eb4285aa9ae7b5bf9be3664eb10121029c0283f9e06fd48a44\
                       def3f362307284f7433084a440c6523b1a34d097c96fbc'
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
                'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpN\
                      sQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
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
              'email': null
              'mobile': null
            'fee': 10000
            'intraWallet': false
            'hash': 'b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba'
            'confirmations': 8
            'txTime': 1419598158
            'publicNote': null
            'note': null
            'tags': []
            'size': 226
            'tx_index': 72945763
            'block_height': 335985
            'result': -85196

        it "should be recognized", ->
          result = MyWallet.processTransaction(tx)
          expect(result["from"]).toEqual(transaction["from"])
          expect(result["to"]).toEqual(transaction["to"])
          

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
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9G\
                      f9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 0
              'script': '76a914fb56d45b9ee3ed21ef7d45b9323e17dcf023afd888ac'
            'script': '47304402203a8c22629e87fd8be70f802977f6d911343f3e333001a3\
                       0f1bb68ffd92b01f08022019af7f2d8e56922ce65dee249168d095d6\
                       d057d1a69393c06c7ee436650a1891012102b37b3c21a106b104d9ac\
                       346bd80fd54f4c77930a58cb590c75911d027238ad8a'
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
            'externalAddresses': [
              'address': '1BwJQxNLnc9CgtVBhRuwdyQsYqhoD4oPWg'
              'amount': 100000
            ]
            'email': null
            'mobile': null
          'fee': 10000
          'intraWallet': false
          'hash': '62636544b31da6a14a419ab1ee3a253bb1ebca65175d351ba4bb54b00b896a87'
          'confirmations': 6
          'txTime': 1425727751
          'publicNote': null
          'note': null
          'tags': []
          'size': 191
          'tx_index': 79823045
          'block_height': 346553
          'result': -110000

        result = MyWallet.processTransaction(tx)
        expect(result["from"]).toEqual(transaction["from"])
        expect(result["to"]).toEqual(transaction["to"])

      ##########################################################################

      describe "with multiple inputs", ->
        tx = undefined
        transaction = undefined
        beforeEach ->
          tx = {
            "hash": "fb405e49418ba1541e7c9419fbb74e97de7115c5af1e6e2b44d9db5faea90604",
            "size": 669,
            "txIndex": 82134531,
            "time": 1427744469,
            "inputs": [
                {
                    "sequence": 4294967295,
                    "prev_out": {
                        "spent": true,
                        "tx_index": 82135992,
                        "type": 0,
                        "addr": "1AVpdo6XPgo47HqoysaWZPZRFxPLitdqYm",
                        "value": 43972,
                        "xpub": {
                            "path": "M/0/3",
                            "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                        },
                        "n": 0,
                        "script": "76a914682c8acbcc643dc46b410c88a57f83a2c8ee69df88ac"
                    },
                    "script": "483045022100e9625fa8c67ae843457c94d8dabac245ca28c651dde8ea84e9aa7cb49feb00180220719b87bc1ad15484daa63df13c1d3a311e2f80c5d590e1cf470ede03b2d7c591012103de2d7ab9895d579bda75a4d180f762e79e662c8efa8567ae39342901bddb9883"
                },
                {
                    "sequence": 4294967295,
                    "prev_out": {
                        "spent": true,
                        "tx_index": 82132444,
                        "type": 0,
                        "addr": "1EivtqKxd93vG4izqrUWsPWHDZjJ5THL3P",
                        "value": 43972,
                        "xpub": {
                            "path": "M/0/2",
                            "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                        },
                        "n": 0,
                        "script": "76a9149687ad84283944beeee005b20360fcc6f401a21e88ac"
                    },
                    "script": "483045022100e778ccd1f45e451aebee4117dbcff739a135b0fc879de7c8951423487230408102202bf23f547a20171552f61ec8580ba5b453eacbf067a59813da649bfb3d6742a501210256f083baf20b888299a2079f172f3d61eb72bce35e4d995b168c7d443f9e0642"
                },
                {
                    "sequence": 4294967295,
                    "prev_out": {
                        "spent": true,
                        "tx_index": 82130805,
                        "type": 0,
                        "addr": "13z5a8VBeBLHdwNJcxaffa5ZddvgTxG1An",
                        "value": 43972,
                        "xpub": {
                            "path": "M/0/1",
                            "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                        },
                        "n": 0,
                        "script": "76a91420bbc6f86141fd083a32b0d8a9761cb317b4b0f688ac"
                    },
                    "script": "483045022100e45b59b72ee3d7533522c1a5945042403e018277a326a94b164dd0a6ec33d4da02200bd97268f9a89832936b14600d77cb35057d6d2966518027bda7e9cf3f459674012102ea09fd86dcb6f3f460bd4bbac4a9ed5c3a41ed1f17d1d18da3180f864fe2c539"
                },
                {
                    "sequence": 4294967295,
                    "prev_out": {
                        "spent": true,
                        "tx_index": 76818246,
                        "type": 0,
                        "addr": "1N97jhtFZ8uvMUiM6TmqwjDtoWhaJ5j2pK",
                        "value": 6516,
                        "xpub": {
                            "path": "M/1/5",
                            "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                        },
                        "n": 1,
                        "script": "76a914e7e397a2b366208767806aecb23298809fe696ba88ac"
                    },
                    "script": "47304402203ad71547254fdfc6f9169737c510df076f25eb631b5675569a329337d087e977022022b7160851209038c30dfd9000c9d483845e7d0c2a14aa03cca69faf652b0b16012103e1e645bc07a1ccb399d4a2a715c7c03cdd9346151b939e6f9dfdbe5b6e30eb87"
                }
            ],
            "out": [
                {
                    "spent": false,
                    "tx_index": 82134531,
                    "type": 0,
                    "addr": "1PZ5GCtYQesYMKEQMtkRQcutLXpkMCWCTM",
                    "value": 123120,
                    "n": 0,
                    "script": "76a914f763a2c98e3792c7136d79fb78ed57050f01139188ac"
                },
                {
                    "spent": false,
                    "tx_index": 82134531,
                    "type": 0,
                    "addr": "17SZkkgB9Vgk39wwv2UcKL8wpcRcie583Z",
                    "value": 5312,
                    "xpub": {
                        "path": "M/1/6",
                        "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                    },
                    "n": 1,
                    "script": "76a91446a67ee6ffecbabea854e73c5b4e715d13a8e4a488ac"
                }
            ],
            "result": -133120,
            "balance": 724507,
            "account_indexes": [
                4,
                4,
                4,
                4,
                4
            ],
            "confirmations": 0
          }
          transaction = {
            "from": {
                "account": {
                    "index": 0,
                    "amount": 38660
                },
                "legacyAddresses": null,
                "externalAddresses": {
                    "addressWithLargestOutput": "1EivtqKxd93vG4izqrUWsPWHDZjJ5THL3P",
                    "amount": 43972
                }
            },
            "to": {
                "account": null,
                "legacyAddresses": null,
                "externalAddresses": [{
                    "address": "1PZ5GCtYQesYMKEQMtkRQcutLXpkMCWCTM",
                    "amount": 123120
                }],
                "email": null,
                "mobile": null
            },
            "fee": 10000,
            "intraWallet": false,
            "hash": "fb405e49418ba1541e7c9419fbb74e97de7115c5af1e6e2b44d9db5faea90604",
            "confirmations": 0,
            "txTime": 1427744469,
            "publicNote": null,
            "note": null,
            "tags": [],
            "size": 669,
            "tx_index": 82134531,
            "result": -133120
          }

        it "should recognize from account", ->
          expect(MyWallet.processTransaction(tx).from.account).toBeDefined()

        it "should recognize to address", ->
          expect(MyWallet.processTransaction(tx).to).toEqual(transaction.to)

        it "should have the correct amount", ->
          expect(MyWallet.processTransaction(tx).result).toEqual(transaction.result)

        it "should not be intra wallet", ->
         result = MyWallet.processTransaction(tx)
         expect(result.intraWallet).toBe(false)

    describe "from external address to account", ->
      tx = undefined
      transaction = undefined

      beforeEach ->
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
            'script': '47304402201e5f48767ce73968fabf6db87297f05c17e48b6b3df709\
                       f6fd265d830e391cf1022028f89c3ca371eec7f89d945eeafdbc4576\
                       96a5235937a5e16021efaed6028367012103296fb539b5de86874336\
                       a26b0099250630434073a265e0fba22165aace87db46'
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
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9G\
                      f9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
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
            'email': null
            'mobile': null
          'fee': 10000
          'intraWallet': false
          'hash': '68ca0a6593f546ab50a41f70b3241795f80d16b8ede7a238f3b9a5b6520f6a6d'
          'confirmations': 3
          'txTime': 1425659266
          'publicNote': null
          'note': null
          'tags': []
          'size': 225
          'tx_index': 79746098
          'block_height': 346444
          'result': 100000
      ##########################################################################
      it "should recognize from address", ->
        expect(MyWallet.processTransaction(tx).from).toEqual(transaction.from)

      it "should recognize to account", ->
        expect(MyWallet.processTransaction(tx).to).toEqual(transaction.to)

      it "should have the correct amount", ->
        expect(MyWallet.processTransaction(tx).result).toEqual(transaction.result)

      it "should not be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(false)


    describe "between accounts", ->
      tx = undefined
      transaction = undefined
      beforeEach ->
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
                'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpN\
                      sQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
              'n': 0
              'script': '76a914217e9754dba345774e0cdf1ebd66a97badf159f788ac'
            'script': '473044022073cdd867c68c5edc805a1bb1cb7682529de8e9eadde28e\
                       9160e6a6e1c759b49402203b28d93525aba094722867192f112d64f7\
                       aaac6070d9a2dfe1afdb6726f99ac2012103dbe5601359b5096eb149\
                       9ac03d801ddc64d5357de486e5765ea1eb8aedcd93a6'
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
                'm': 'xpub6DWoQTdpQcaSm4q9pj9A5EZdCs3NcmM5x8aRoi3VAGXJUCkJhmREW\
                      MCaAahs9nhMq7RnseKBV4uwkqCP8g43sEnMXRfFes2BxGagJqZfS5A'
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
                'm': 'xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpN\
                      sQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5'
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
            'email': null
            'mobile': null
          'fee': 10000
          'intraWallet': true
          'hash': 'eb70c6df08de770782b351c84fb2a96ea100d37ff8edcad579c32c52213c26f7'
          'confirmations': 27
          'txTime': 1419596460
          'publicNote': null
          'note': null
          'tags': []
          'size': 225
          'tx_index': 72943968
          'block_height': 335980
          'result': 100000

      ##########################################################################
      it "should recognize from account", ->
        expect(MyWallet.processTransaction(tx).from).toEqual(transaction.from)

      it "should recognize to account", ->
        expect(MyWallet.processTransaction(tx).to).toEqual(transaction.to)

      it "should have the correct amount", ->
        expect(MyWallet.processTransaction(tx).result).toEqual(transaction.result)

      it "should be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(true)

    describe "from legacy address to external address", ->
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
          'script': '4730440220365779bbc2b5f83d575f32a0bdc01630aff96d71d1845f\
                     ad5f55d91f1012a3b4022068993156c45fd5ac779a5eed6848cd6acc\
                     26490ba0cbbc1362403437de945b20014104748bed81c1f6c72a63d2\
                     e9d39756ec17488cd5298f53f87dcbcb2bc6ea5e4bd046336d7411c1\
                     6e08c00390481d67dc448535596ac7361159f359ca357a7da2ee'
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
          'externalAddresses': [
            'address': '1FeerpCgswvGRLVKme759C96DUBtf7SvA2'
            'amount': 20000
          ]
          'email': null
          'mobile': null
        'fee': 10000
        'intraWallet': false
        'hash': '391cfffa273d82866b367af7941fb3aca35b5a1a95003140a148166bf5d02ee8'
        'confirmations': 37
        'txTime': 1419595953
        'publicNote': null
        'note': null
        'tags': []
        'size': 257
        'tx_index': 72943525
        'block_height': 335980
        'result': -30000


      it "should recognize from address", ->
        expect(MyWallet.processTransaction(tx).from).toEqual(transaction.from)

      it "should recognize to address", ->
        expect(MyWallet.processTransaction(tx).to).toEqual(transaction.to)

      it "should have the correct amount", ->
        expect(MyWallet.processTransaction(tx).result).toEqual(transaction.result)

      it "should not be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(false)

    describe "between legacy addresses", ->
      tx =
        'hash': '7134e24bdc3a26522e251dfd1e4c2f94b2fb63541d65eda323a87456bb80de9f'
        'size': 258
        'txIndex': 80032677
        'time': 1425918981
        'inputs': [ {
          'sequence': 4294967295
          'prev_out':
            'spent': true
            'tx_index': 80021322
            'type': 0
            'addr': '1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX'
            'value': 50000
            'n': 0
            'script': '76a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac'
          'script': '483045022100a7aab5963bd754a39e24a0e81781f6f22f2c6ed28baf\
                     88d59b74703d4ab4232a022055ef9718955fc2782df97d8a9b6644e3\
                     bbe2dc9421071bb66b129ca92248224a0141044ca8bee9fa5d4e372a\
                     00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cc\
                     ed88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87'
        } ]
        'out': [
          {
            'spent': false
            'tx_index': 80032677
            'type': 0
            'addr': '1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF'
            'value': 30000
            'n': 0
            'script': '76a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac'
          }
          {
            'spent': false
            'tx_index': 80032677
            'type': 0
            'addr': '1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX'
            'value': 10000
            'n': 1
            'script': '76a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac'
          }
        ]
        'result': -10000
        'blockHeight': null
        'balance': 170000
        'account_indexes': []
        'confirmations': 0

      transaction =
        'from':
          'account': null
          'legacyAddresses': [ {
            'address': '1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX'
            'amount': 40000
          } ]
          'externalAddresses': null
        'to':
          'account': null
          'legacyAddresses': [ {
            'address': '1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF'
            'amount': 30000
          } ]
          'externalAddresses': null
          'email': null
          'mobile': null
        'fee': 10000
        'intraWallet': true
        'hash': '7134e24bdc3a26522e251dfd1e4c2f94b2fb63541d65eda323a87456bb80de9f'
        'confirmations': 0
        'txTime': 1425918981
        'publicNote': null
        'note': null
        'tags': []
        'size': 258
        'tx_index': 80032677
        'block_height': null
        'result': 30000

      it "should recognize from address", ->
        expect(MyWallet.processTransaction(tx).from).toEqual(transaction.from)

      it "should recognize to address", ->
        expect(MyWallet.processTransaction(tx).to).toEqual(transaction.to)

      it "should have the correct amount", ->
        expect(MyWallet.processTransaction(tx).result).toEqual(transaction.result)

      it "should be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(true)

    describe "from legacy address to account", ->
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
          'script': '47304402200b6456e842e53fd8aafb2d2e17b22b93eae657c8d3be70\
                     e044920ccc788b6ff002202355b990ef026d1d25c16158ceeeb22718\
                     752a7aceead065aeaa7bdc0a4c9d93014104be6fba00626de654c299\
                     2f4e35d03cacd8685ee723e94262c57ebd3113c0b7d6742316b6aa94\
                     38a1ebebfbe5979a3a0e22d1b96a7d83703b2ee23fc22f9ce7e8'
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
              'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9G\
                    f9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
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
          'email': null
          'mobile': null
        'fee': 10000
        'intraWallet': true
        'hash': '6c3224f1bd35ec8e57fc8494c65f6964ba4eec8eba1a1b6c77410a480cba6a01'
        'confirmations': 0
        'txTime': 1425915550
        'publicNote': null
        'note': null
        'tags': []
        'size': 257
        'tx_index': 80026565
        'block_height': null
        'result': 60000

      ##########################################################################
      it "should recognize from address", ->
        expect(MyWallet.processTransaction(tx).from).toEqual(transaction.from)

      it "should recognize to account", ->
        expect(MyWallet.processTransaction(tx).to).toEqual(transaction.to)

      it "should have the correct amount", ->
        expect(MyWallet.processTransaction(tx).result).toEqual(transaction.result)

      it "should be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(true)

    describe "from account to legacy address", ->
      tx = undefined
      transaction = undefined

      beforeEach ->
        ##########################################################################
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
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9G\
                      f9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
              'n': 0
              'script': '76a914d9f912e7a05c413cb887f752cbc30a606898512888ac'
            'script': '483045022100ecf7f6f74fa2a1ed815f66e1d7af7bc5c9bdfaa7b3ac\
                       16116d678ddfe3df164e022026a1ce2395d157a48070398b57696c83\
                       39a535b97f86993881624ee0a498663b012103a5b4b1010b03bf2163\
                       2efc7e6d96bad9553ee121330bc5cffce69ebbe034f007'
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
                'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9G\
                      f9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
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
            'email': null
            'mobile': null
          'fee': 10000
          'intraWallet': true
          'hash': '9d470a7518f3f98b865f2c68f4a39f64138fc61807ba4168764b104798800911'
          'confirmations': 0
          'txTime': 1425912653
          'publicNote': null
          'note': null
          'tags': []
          'size': 226
          'tx_index': 80021322
          'block_height': 346868
          'result': 50000

      it "should recognize from account", ->
        expect(MyWallet.processTransaction(tx).from).toEqual(transaction.from)

      it "should recognize to address", ->
        expect(MyWallet.processTransaction(tx).to).toEqual(transaction.to)

      it "should have the correct amount", ->
        expect(MyWallet.processTransaction(tx).result).toEqual(transaction.result)

      it "should be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(true)

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
            'script': '483045022100d183490a2e9e978a0deb4fe06cd54211904aebbe8b6b\
                       3fbb1c5f2fd847655ab502203dffa200b1419b3a083f8b430e2be25f\
                       e8b0eff80d74707104c4ceaf272ab1a601210250f530ecfcb81861cd\
                       48a8849db546c48f1fad45377fcf33189e733c3024d6a0'
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
            'email': null
            'mobile': null
          'fee': 10000
          'intraWallet': false
          'hash': '1ae6e674f0ea63284ea471f2809f5c84574237d589e16eee356c76d691fe9272'
          'confirmations': 25
          'txTime': 1420717021
          'publicNote': null
          'note': null
          'tags': []
          'size': 226
          'tx_index': 74018824
          'block_height': 338047
          'result': 40959

        result = MyWallet.processTransaction(tx)

        # Amount should be ex. change
        expect(result["from"]).toEqual(transaction["from"])
        # It shouldn't include the change
        expect(result["to"]).toEqual(transaction["to"])

    describe "to email", ->
      pending()
      paidTo["3d14659f29c8d7380cc9998e1d696494e1a1cd27e030b1824499b5ce3afec5ca"] =
        address: "1K9H68VuHYgzEW13srbBRHQiZ48qsCZiz2"
        email: "info@blockchain.com"
        mobile: null
        redeemedAt: null

      tx = {
        "hash": "3d14659f29c8d7380cc9998e1d696494e1a1cd27e030b1824499b5ce3afec5ca",
        "size": 225,
        "txIndex": 81004662,
        "time": 1426761515,
        "inputs": [
            {
                "sequence": 4294967295,
                "prev_out": {
                    "spent": true,
                    "tx_index": 81001062,
                    "type": 0,
                    "addr": "1AhmcswVJhhAuFmYn933rGuJKj8frKrR4W",
                    "value": 256036,
                    "xpub": {
                        "path": "M/1/5",
                        "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                    },
                    "n": 1,
                    "script": "76a9146a6f0428ed2771b9bca2cbfc47c53305adb13d4e88ac"
                },
                "script": "473044022012e476a979225d5c2adbc0395444741525a97c4c6e5e4f82c4fa30373b1681b00220201c391e8fbf4bc6c385dc3a5d808c9d31c661e1d5ccb61161ba67affc4c19560121021ccecd1bae8d54ec982a23e84de552712c751e01edf5c9f4d34a9a0d88f515b4"
            }
        ],
        "out": [
            {
                "spent": false,
                "tx_index": 81004662,
                "type": 0,
                "addr": "1K9H68VuHYgzEW13srbBRHQiZ48qsCZiz2",
                "value": 20000,
                "n": 0,
                "script": "76a914c70305918e4ebd1d256a5b73ae99d6d36c47cf2988ac"
            },
            {
                "spent": true,
                "tx_index": 81004662,
                "type": 0,
                "addr": "1M8RzPni5mNj4xmtzKnVaRjP2MCUWsRuWP",
                "value": 226036,
                "xpub": {
                    "path": "M/1/6",
                    "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                },
                "n": 1,
                "script": "76a914dcca49a16e24bf9415f18df7cf8a263c7429dd8b88ac"
            }
        ],
        "result": -10000,
        "blockHeight": 348273,
        "balance": 315906,
        "account_indexes": [
            0,
            0
        ],
        "confirmations": 4
      }

      transaction = {
        "from": {
            "account": {
                "index": 0,
                "amount": 30000
            },
            "legacyAddresses": null,
            "externalAddresses": null
        },
        "to": {
            "account": null,
            "legacyAddresses": null,
            "externalAddresses": null,
            "email": {
                "email": "info@blockchain.com",
                "redeemedAt": null
            },
            "mobile": null
        },
        "fee": 30000,
        "intraWallet": false,
        "hash": "3d14659f29c8d7380cc9998e1d696494e1a1cd27e030b1824499b5ce3afec5ca",
        "confirmations": 4,
        "txTime": 1426761515,
        "publicNote": null,
        "note": "Naar email",
        "tags": [],
        "size": 225,
        "tx_index": 81004662,
        "block_height": 348273,
        "result": -10000
      }

      it "should be recognized", ->
        result = MyWallet.processTransaction(tx)
        expect(result.to).toEqual(transaction.to)

      it "should not be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(false)

    describe "to mobile", ->
      pending()
      paidTo["f7cab2c5c2df517fae77e90cd1d85f77b826e92b4769113cbfb9aff61a9b5b81"] =
        "email":null,
        "mobile":"+31111111111",
        "redeemedAt":null,
        "address": "1CifSS1USfx3ZCRozis5MnRAP3Ev9cT7Zu"

      tx = {
        "hash": "f7cab2c5c2df517fae77e90cd1d85f77b826e92b4769113cbfb9aff61a9b5b81",
        "size": 225,
        "txIndex": 80848993,
        "time": 1426623900,
        "inputs": [
            {
                "sequence": 4294967295,
                "prev_out": {
                    "spent": true,
                    "tx_index": 80838974,
                    "type": 0,
                    "addr": "1FbhEFqBcoFCCjPyScp6BceZDqBwvWeK6E",
                    "value": 318036,
                    "xpub": {
                        "path": "M/1/3",
                        "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                    },
                    "n": 1,
                    "script": "76a914a0217c1a1a223f54a916258d6fc8139f6b6b211988ac"
                },
                "script": "473044022023d2069ba19eebc4869124005b4560f67879c9fc96a2e3ca92285b76e08c39cc0220625352950eae5b8081b4494bb61e950b5af8685a7483b098eaa56db91a1186c00121022801cf9df1c49972e73235aed1ca1ad5e88bf4293156dc44a99580604fe563e2"
            }
        ],
        "out": [
            {
                "spent": false,
                "tx_index": 80848993,
                "type": 0,
                "addr": "1CifSS1USfx3ZCRozis5MnRAP3Ev9cT7Zu",
                "value": 22000,
                "n": 0,
                "script": "76a914808a865e0c70359dc00a274b19a0e16fc19dc41c88ac"
            },
            {
                "spent": false,
                "tx_index": 80848993,
                "type": 0,
                "addr": "1N2H3sKgv9dVqBxDtnEpn35iTrDvMba9XG",
                "value": 286036,
                "xpub": {
                    "path": "M/1/4",
                    "m": "xpub6DWoQTdpQcaSjAtcsCX2kasHB4U12MiLSYSFWCHbdhtcM2GRrvGpNsQMLE4bNYaZHSQJYsTvpZoJCcyzTfGesV46A8SucSGhE4jfBngXrR5"
                },
                "n": 1,
                "script": "76a914e698746f1cd6836a89207a2ed1526ccbf4796eae88ac"
            }
        ],
        "result": -10000,
        "blockHeight": 348037,
        "balance": 375906,
        "account_indexes": [
            0,
            0
        ],
        "confirmations": 232
      }

      transaction = {
        "from": {
            "account": {
                "index": 0,
                "amount": 32000
            },
            "legacyAddresses": null,
            "externalAddresses": null
        },
        "to": {
            "account": null,
            "legacyAddresses": null,
            "externalAddresses": null,
            "email" : null,
            "mobile" : {
              "number":"+31111111111",
              "redeemedAt":null
            }
        },
        "fee": 10000,
        "intraWallet": false,
        "hash": "f7cab2c5c2df517fae77e90cd1d85f77b826e92b4769113cbfb9aff61a9b5b81",
        "confirmations": 232,
        "txTime": 1426623900,
        "publicNote": null,
        "note": null,
        "tags": [],
        "size": 225,
        "tx_index": 80848993,
        "block_height": 348037,
        "result": -10000
      }


      it "should be recognized", ->
        result = MyWallet.processTransaction(tx)
        expect(result.to).toEqual(transaction.to)

      it "should not be intra wallet", ->
       result = MyWallet.processTransaction(tx)
       expect(result.intraWallet).toBe(false)

    describe "confirmations", ->
      ##########################################################################
      it "should be fetched via getConfirmationsForTx()", ->
        MyWallet.processTransaction(defaultSampleTx)
        expect(MyWallet.getConfirmationsForTx).toHaveBeenCalled()

    describe "fee", ->
      it "default sample transactions should have 0.0001 BTC fee", ->
        rawTx = defaultSampleTx
        
        expect(MyWallet.processTransaction(rawTx).fee).toEqual(10000)
        
      it "should flag frugal fee", ->
        rawTx = defaultSampleTx
        rawTx.confirmations = 0
        
        # Reduce the previous output by 0.0001 BTC so as to make it frugal
        rawTx.inputs[0].prev_out.value -= 10000
  
        processedTx = MyWallet.processTransaction(rawTx)
        expect(processedTx.frugal).toBe(true)
        
      it "should not flag an 0.0001(0000) BTC fee as frugal", ->
        rawTx = defaultSampleTx
        rawTx.confirmations = 0
        rawTx.fee = 10000 
        processedTx = MyWallet.processTransaction(rawTx)
        expect(processedTx.frugal).toBe(false)
    
    describe "double spend", ->
        
      it "should be recognised when receiving" ,->
        rawTx = defaultSampleTx
        rawTx.double_spend = true
        processedTx = MyWallet.processTransaction(rawTx)
        expect(processedTx.double_spend).toBe(true)

  describe "getConfirmationsForTx()", ->
    ##########################################################################
    it "a tx with null confirmations should return 0 and tx.setConfirmations(0) should be called.", ->
      latestBlock =
        height: 335984
      defaultSampleTx.blockHeight = null
      defaultSampleTx.setConfirmations = (c) -> c
      spyOn(defaultSampleTx, "setConfirmations")

      conf = MyWallet.getConfirmationsForTx latestBlock, defaultSampleTx

      expect(defaultSampleTx.setConfirmations).toHaveBeenCalled()
      expect(defaultSampleTx.setConfirmations).toHaveBeenCalledWith(0)
      expect(conf).toEqual(0)

    it "defaultSampleTx should have 100 confirmations with the mocked latest block", ->
      latestBlock =
        height: 336084

      conf = MyWallet.getConfirmationsForTx latestBlock, defaultSampleTx

      expect(conf).toEqual(100)

    it "defaultSampleTx should have 1 confirmation with the mocked latest block", ->
      latestBlock =
        height: 335985

      conf = MyWallet.getConfirmationsForTx latestBlock, defaultSampleTx

      expect(conf).toEqual(1)
