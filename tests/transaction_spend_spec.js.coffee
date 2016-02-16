Transaction = require('../src/transaction')
MyWallet    = require('../src/wallet')
Bitcoin     = require('bitcoinjs-lib')

describe "Transaction", ->

  observer              = undefined
  data                  = undefined

  beforeEach ->
    data =
      from: "1DiJVG3oD3yeqW26qcVaghwTjvMaVoeghX"
      privateKey: 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj'
      to: "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
      amount: 50000
      toMultiple: ["1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h","1FfmbHfnpaZjKFvyi1okTjJJusN455paPH"]
      multipleAmounts: [20000,10000]
      fee: 10000
      note: "That is an expensive toy"
      unspentMock: [
          {
            "tx_hash": "594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861"
            "hash": "6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59"
            "tx_hash_big_endian": "6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59"
            "tx_index": 82222265
            "index": 0
            "tx_output_n": 0
            "script": "76a91449f842901a0c81fb9c0c0f8c61027d2b085a2a9088ac"
            "value": 61746
            "value_hex": "00f132"
            "confirmations": 0
          }
      ]


    observer =
      success: () -> return
      error: () -> return
      listener: () -> return

    spyOn(observer, 'success')
    spyOn(observer, 'error')
    spyOn(observer, 'listener')

    window.BlockchainAPI =
      get_unspent: () ->
      push_tx: () ->

    spyOn(BlockchainAPI, "push_tx")
      .and.callFake((tx, note, success, error) ->
        success())

    spyOn(BlockchainAPI, "get_unspent")
      .and.callFake((xpubList,success,error,conf,nocache) ->
        success(getUnspentMock))

    # spyOn(WalletStore, "getPrivateKey").and.callFake((address) -> 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj')

  describe "create new Transaction", ->
    it "should fail without unspent outputs", ->

      # expect(test).toThrowError(AssertionError, 'Missing coins to spend')

      try
        new Transaction(null, data.to, data.amount, data.fee, data.from, null)
      catch e
        expect(e.name).toBe('AssertionError')
        expect(e.message).toBe('Missing coins to spend')

    it "should fail without amount lower than dust threshold", ->

      data.amount = 100

      try
        new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)
      catch e
        expect(e.name).toBe('AssertionError')
        expect(e.message).toContain('dust threshold')

    it "should initialize with good data", ->

      new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

    it "should create multiple outputs", ->

      tx = new Transaction(data.unspentMock, data.toMultiple, data.multipleAmounts, data.fee, data.from, null)

      privateKeyBase58 = data.privateKey
      format = MyWallet.detectPrivateKeyFormat(privateKeyBase58)
      key = MyWallet.privateKeyStringToKey(privateKeyBase58, format)
      key.compressed = false;
      privateKeys = [key]

      tx.addPrivateKeys(privateKeys)

      tx = tx.sign().build()

      expectedHex = '0100000001594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861000000008a4730440220354fd8f420d1f3ffc802af13d451f853d26f343b10225e92a17d3e831edb81960220074d8dac3c497a0481e2041df4f3cd7a82e32415c11b2054b246187f3ff733a8014104a7392f5628776b530aa5fbb41ac10c327ccd2cf64622a81671038ecda25084af786fd54d43689241694d1d65e6bde98756fa01dfd2f5a90d5318ab3fb7bad8c1ffffffff03204e0000000000001976a914078d35591e340799ee96968936e8b2ea8ce504a688ac10270000000000001976a914a0e6ca5444e4d8b7c80f70237f332320387f18c788acf2540000000000001976a9148b71295471e921703a938aa9e01433deb07c1aa588ac00000000'
      expect(tx.toHex()).toEqual(expectedHex)

  describe "provide Transaction with private keys", ->

    it "should want addresses when supplied with unspent outputs", ->

      transaction = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

      expect(transaction.addressesOfNeededPrivateKeys.length).toBe(1)
      expect(transaction.pathsOfNeededPrivateKeys.length).toBe(0)

    it "should accept the right private key", ->

      transaction = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

      privateKeyBase58 = data.privateKey
      format = MyWallet.detectPrivateKeyFormat(privateKeyBase58)
      key = MyWallet.privateKeyStringToKey(privateKeyBase58, format)
      key.compressed = false;
      privateKeys = [key]

      transaction.addPrivateKeys(privateKeys)
      expect(transaction.privateKeys).toEqual(privateKeys)

    it "should not accept the wrong private key", ->

      transaction = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

      privateKeyWIF = '5JfdACpmDbLk7jmjU6kuCdLNFgedL19RnbjZYENAEG8Ntto9zRc'
      format = MyWallet.detectPrivateKeyFormat(privateKeyWIF)
      key = MyWallet.privateKeyStringToKey(privateKeyWIF, format)
      privateKeys = [key]

      expect( () -> transaction.addPrivateKeys(privateKeys) ).toThrow

    it "should sign and produce the correct signed script", ->

      transaction = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

      privateKeyBase58 = data.privateKey
      format = MyWallet.detectPrivateKeyFormat(privateKeyBase58)
      key = MyWallet.privateKeyStringToKey(privateKeyBase58, format)
      key.compressed = false;
      privateKeys = [key]

      transaction.addPrivateKeys(privateKeys)
      tx = transaction.sign().build()

      expectedHex = '0100000001594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861000000008a4730440220187d6b567d29fe10bea29aa36158edb3fcd9bed5e835b93b9f30d630aea1c7740220612be05b0d87b0a170f7ead7f9688d7172c704f63deb74705779cf8ac26ec3b9014104a7392f5628776b530aa5fbb41ac10c327ccd2cf64622a81671038ecda25084af786fd54d43689241694d1d65e6bde98756fa01dfd2f5a90d5318ab3fb7bad8c1ffffffff0250c30000000000001976a914078d35591e340799ee96968936e8b2ea8ce504a688acd2060000000000001976a9148b71295471e921703a938aa9e01433deb07c1aa588ac00000000'
      expect(tx.toHex()).toEqual(expectedHex)


    describe "BIP69 transaction inputs and outputs", ->
      getIn = undefined
      getOut = undefined

      beforeEach ->
        getIn  = (input)  -> [].reverse.call(input.hash).toString("hex")
        getOut = (output) -> output.script.toString("hex")


      it "should sort testvector 1", ->
        sortedInputs = [
           "0e53ec5dfb2cb8a71fec32dc9a634a35b7e24799295ddd5278217822e0b31f57",
           "26aa6e6d8b9e49bb0630aac301db6757c02e3619feb4ee0eea81eb1672947024",
           "28e0fdd185542f2c6ea19030b0796051e7772b6026dd5ddccd7a2f93b73e6fc2",
           "381de9b9ae1a94d9c17f6a08ef9d341a5ce29e2e60c36a52d333ff6203e58d5d",
           "3b8b2f8efceb60ba78ca8bba206a137f14cb5ea4035e761ee204302d46b98de2",
           "402b2c02411720bf409eff60d05adad684f135838962823f3614cc657dd7bc0a",
           "54ffff182965ed0957dba1239c27164ace5a73c9b62a660c74b7b7f15ff61e7a",
           "643e5f4e66373a57251fb173151e838ccd27d279aca882997e005016bb53d5aa",
           "6c1d56f31b2de4bfc6aaea28396b333102b1f600da9c6d6149e96ca43f1102b1",
           "7a1de137cbafb5c70405455c49c5104ca3057a1f1243e6563bb9245c9c88c191",
           "7d037ceb2ee0dc03e82f17be7935d238b35d1deabf953a892a4507bfbeeb3ba4",
           "a5e899dddb28776ea9ddac0a502316d53a4a3fca607c72f66c470e0412e34086",
           "b4112b8f900a7ca0c8b0e7c4dfad35c6be5f6be46b3458974988e1cdb2fa61b8",
           "bafd65e3c7f3f9fdfdc1ddb026131b278c3be1af90a4a6ffa78c4658f9ec0c85",
           "de0411a1e97484a2804ff1dbde260ac19de841bebad1880c782941aca883b4e9",
           "f0a130a84912d03c1d284974f563c5949ac13f8342b8112edff52971599e6a45",
           "f320832a9d2e2452af63154bc687493484a0e7745ebd3aaf9ca19eb80834ad60"]
        sortedOutputs = [
           "76a9144a5fba237213a062f6f57978f796390bdcf8d01588ac",
           "76a9145be32612930b8323add2212a4ec03c1562084f8488ac"]


        txHex = "0100000011aad553bb1650007e9982a8ac79d227cd8c831e1573b11f25573a37664e5f3e64000000006a47304402205438cedd30ee828b0938a863e08d810526123746c1f4abee5b7bc2312373450c02207f26914f4275f8f0040ab3375bacc8c5d610c095db8ed0785de5dc57456591a601210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffffc26f3eb7932f7acddc5ddd26602b77e7516079b03090a16e2c2f5485d1fde028000000006b483045022100f81d98c1de9bb61063a5e6671d191b400fda3a07d886e663799760393405439d0220234303c9af4bad3d665f00277fe70cdd26cd56679f114a40d9107249d29c979401210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff456a9e597129f5df2e11b842833fc19a94c563f57449281d3cd01249a830a1f0000000006a47304402202310b00924794ef68a8f09564fd0bb128838c66bc45d1a3f95c5cab52680f166022039fc99138c29f6c434012b14aca651b1c02d97324d6bd9dd0ffced0782c7e3bd01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff571fb3e02278217852dd5d299947e2b7354a639adc32ec1fa7b82cfb5dec530e000000006b483045022100d276251f1f4479d8521269ec8b1b45c6f0e779fcf1658ec627689fa8a55a9ca50220212a1e307e6182479818c543e1b47d62e4fc3ce6cc7fc78183c7071d245839df01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff5d8de50362ff33d3526ac3602e9ee25c1a349def086a7fc1d9941aaeb9e91d38010000006b4830450221008768eeb1240451c127b88d89047dd387d13357ce5496726fc7813edc6acd55ac022015187451c3fb66629af38fdb061dfb39899244b15c45e4a7ccc31064a059730d01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff60ad3408b89ea19caf3abd5e74e7a084344987c64b1563af52242e9d2a8320f3000000006b4830450221009be4261ec050ebf33fa3d47248c7086e4c247cafbb100ea7cee4aa81cd1383f5022008a70d6402b153560096c849d7da6fe61c771a60e41ff457aac30673ceceafee01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffffe9b483a8ac4129780c88d1babe41e89dc10a26dedbf14f80a28474e9a11104de010000006b4830450221009bc40eee321b39b5dc26883f79cd1f5a226fc6eed9e79e21d828f4c23190c57e022078182fd6086e265589105023d9efa4cba83f38c674a499481bd54eee196b033f01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffffe28db9462d3004e21e765e03a45ecb147f136a20ba8bca78ba60ebfc8e2f8b3b000000006a47304402200fb572b7c6916515452e370c2b6f97fcae54abe0793d804a5a53e419983fae1602205191984b6928bf4a1e25b00e5b5569a0ce1ecb82db2dea75fe4378673b53b9e801210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff7a1ef65ff1b7b7740c662ab6c9735ace4a16279c23a1db5709ed652918ffff54010000006a47304402206bc218a925f7280d615c8ea4f0131a9f26e7fc64cff6eeeb44edb88aba14f1910220779d5d67231bc2d2d93c3c5ab74dcd193dd3d04023e58709ad7ffbf95161be6201210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff850cecf958468ca7ffa6a490afe13b8c271b1326b0ddc1fdfdf9f3c7e365fdba000000006a473044022047df98cc26bd2bfdc5b2b97c27aead78a214810ff023e721339292d5ce50823d02205fe99dc5f667908974dae40cc7a9475af7fa6671ba44f64a00fcd01fa12ab523012102ca46fa75454650afba1784bc7b079d687e808634411e4beff1f70e44596308a1ffffffff8640e312040e476cf6727c60ca3f4a3ad51623500aacdda96e7728dbdd99e8a5000000006a47304402205566aa84d3d84226d5ab93e6f253b57b3ef37eb09bb73441dae35de86271352a02206ee0b7f800f73695a2073a2967c9ad99e19f6ddf18ce877adf822e408ba9291e01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff91c1889c5c24b93b56e643121f7a05a34c10c5495c450504c7b5afcb37e11d7a000000006b483045022100df61d45bbaa4571cdd6c5c822cba458cdc55285cdf7ba9cd5bb9fc18096deb9102201caf8c771204df7fd7c920c4489da7bc3a60e1d23c1a97e237c63afe53250b4a01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff2470947216eb81ea0eeeb4fe19362ec05767db01c3aa3006bb499e8b6d6eaa26010000006a473044022031501a0b2846b8822a32b9947b058d89d32fc758e009fc2130c2e5effc925af70220574ef3c9e350cef726c75114f0701fd8b188c6ec5f84adce0ed5c393828a5ae001210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff0abcd77d65cc14363f8262898335f184d6da5ad060ff9e40bf201741022c2b40010000006b483045022100a6ac110802b699f9a2bff0eea252d32e3d572b19214d49d8bb7405efa2af28f1022033b7563eb595f6d7ed7ec01734e17b505214fe0851352ed9c3c8120d53268e9a01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffffa43bebbebf07452a893a95bfea1d5db338d23579be172fe803dce02eeb7c037d010000006b483045022100ebc77ed0f11d15fe630fe533dc350c2ddc1c81cfeb81d5a27d0587163f58a28c02200983b2a32a1014bab633bfc9258083ac282b79566b6b3fa45c1e6758610444f401210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffffb102113fa46ce949616d9cda00f6b10231336b3928eaaac6bfe42d1bf3561d6c010000006a473044022010f8731929a55c1c49610722e965635529ed895b2292d781b183d465799906b20220098359adcbc669cd4b294cc129b110fe035d2f76517248f4b7129f3bf793d07f01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffffb861fab2cde188499758346be46b5fbec635addfc4e7b0c8a07c0a908f2b11b4000000006a47304402207328142bb02ef5d6496a210300f4aea71f67683b842fa3df32cae6c88b49a9bb022020f56ddff5042260cfda2c9f39b7dec858cc2f4a76a987cd2dc25945b04e15fe01210391064d5b2d1c70f264969046fcff853a7e2bfde5d121d38dc5ebd7bc37c2b210ffffffff027064d817000000001976a9144a5fba237213a062f6f57978f796390bdcf8d01588ac00902f50090000001976a9145be32612930b8323add2212a4ec03c1562084f8488ac00000000"
        tx = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)
        tx.transaction.tx = new Bitcoin.Transaction.fromHex(txHex)
        tx.privateKeys = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]
        tx.addressesOfInputs = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]
        tx.sortBIP69()

        allSortedIns  = (getIn( tx.transaction.tx.ins[i] ) is sortedInputs[i]  for i in [0..16]).every((x)->x)
        allSortedOuts = (getOut(tx.transaction.tx.outs[i]) is sortedOutputs[i] for i in [0..1 ]).every((x)->x)

        expect(allSortedIns).toBeTruthy()
        expect(allSortedOuts).toBeTruthy()

      it "should sort testvector 2", ->
        sortedInputs = [
           "35288d269cee1941eaebb2ea85e32b42cdb2b04284a56d8b14dcc3f5c65d6055",
           "35288d269cee1941eaebb2ea85e32b42cdb2b04284a56d8b14dcc3f5c65d6055"]
        sortedOutputs = [
           "41046a0765b5865641ce08dd39690aade26dfbf5511430ca428a3089261361cef170e3929a68aee3d8d4848b0c5111b0a37b82b86ad559fd2a745b44d8e8d9dfdc0cac",
           "41044a656f065871a353f216ca26cef8dde2f03e8c16202d2e8ad769f02032cb86a5eb5e56842e92e19141d60a01928f8dd2c875a390f67c1f6c94cfc617c0ea45afac"]

        txHex = "010000000255605dc6f5c3dc148b6da58442b0b2cd422be385eab2ebea4119ee9c268d28350000000049483045022100aa46504baa86df8a33b1192b1b9367b4d729dc41e389f2c04f3e5c7f0559aae702205e82253a54bf5c4f65b7428551554b2045167d6d206dfe6a2e198127d3f7df1501ffffffff55605dc6f5c3dc148b6da58442b0b2cd422be385eab2ebea4119ee9c268d2835010000004847304402202329484c35fa9d6bb32a55a70c0982f606ce0e3634b69006138683bcd12cbb6602200c28feb1e2555c3210f1dddb299738b4ff8bbe9667b68cb8764b5ac17b7adf0001ffffffff0200e1f505000000004341046a0765b5865641ce08dd39690aade26dfbf5511430ca428a3089261361cef170e3929a68aee3d8d4848b0c5111b0a37b82b86ad559fd2a745b44d8e8d9dfdc0cac00180d8f000000004341044a656f065871a353f216ca26cef8dde2f03e8c16202d2e8ad769f02032cb86a5eb5e56842e92e19141d60a01928f8dd2c875a390f67c1f6c94cfc617c0ea45afac00000000"
        tx = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)
        tx.transaction.tx = new Bitcoin.Transaction.fromHex(txHex)
        tx.privateKeys = [1,2]
        tx.addressesOfInputs = [1,2]
        tx.transaction.tx.ins.reverse();  # change default because it is already correct
        tx.transaction.tx.outs.reverse(); # change default because it is already correct
        tx.sortBIP69()
        allSortedIns  = (getIn( tx.transaction.tx.ins[i] ) is sortedInputs[i]  for i in [0..1]).every((x)->x)
        allSortedOuts = (getOut(tx.transaction.tx.outs[i]) is sortedOutputs[i] for i in [0..1]).every((x)->x)
        expect(allSortedIns).toBeTruthy()
        expect(allSortedOuts).toBeTruthy()
