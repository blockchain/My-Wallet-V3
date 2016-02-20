proxyquire = require('proxyquireify')(require)
MyWallet   = undefined
Address    = undefined
Wallet     = undefined
HDWallet   = undefined
WalletStore = undefined

describe "Blockchain-Wallet", ->
  wallet = undefined
  object =
    'guid': 'c8d9fe67-2ba0-4c15-a2be-0d17981d3c0a'
    'sharedKey': '981b98e8-03f5-48fa-b369-038e2a7fdc09'
    'double_encryption': false
    'options':
      'pbkdf2_iterations': 5000
      'fee_per_kb': 10000
      'html5_notifications': false
      'logout_time': 600000
    'address_book': [{'address': '1dice8EMZmqKvrGE4Qc9bUFf9PX3xaYDp', 'label': 'SatoshiDice'}]
    'tx_notes': {}
    'tx_names': []
    'keys': [
      {
        'addr': '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv'
        'priv': 'HUFhy1SvLBzzdAYpwD3quUN9kxqmm9U3Y1ZDdwBhHjPH'
        'tag': 0
        'created_time': 1437494028974
        'created_device_name': 'javascript_web'
        'created_device_version': '1.0'
      }, {
        'addr': '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9'
        'priv': null
      },
      {
        'addr': '1H8Cwvr3Vq9rJBGEoudG1AeyeAezr38j8h'
        'priv': '5KHY1QhUx8BYrdZPV6GcRw5rVKyAHbjZxz9KLYkaoL16JuFBZv8'
        'tag': 2
        'created_time': 1437494028974
        'created_device_name': 'javascript_web'
        'created_device_version': '1.0'
      },
    ]
    'paidTo': {}
    'hd_wallets': [ {
      'seed_hex': '7e061ca8e579e5e70e9989ca40d342fe'
      'passphrase': ''
      'mnemonic_verified': false
      'default_account_idx': 0
      'accounts': [ {
        'label': 'My Bitcoin Wallet'
        'archived': false
        'xpriv': 'xprv9yko4kDvhYSdUcqK5e8naLwtGE1Ca57mwJ6JMB8WxeYq8t1w3PpiZfGGvLN6N6GEwLF8XuHnp8HeNLrWWviAjXxb2BFEiLaW2UgukMZ3Zva'
        'xpub': 'xpub6Ck9UFkpXuzvh6unBffnwUtcpFqgyXqdJX1u9ZY8Wz5p1gM5aw8y7TakmcEWLA9rJkc59BJzn61p3qqKSaqFkSPMbbhGA9YDNmphj9SKBVJ'
        'address_labels': []
        'cache':
          'receiveAccount': 'xpub6FD59hfbH1UWQA9B8NP1C8bh3jc6i2tpM6b8f4Wi9gHWQttZbBBtEsDDZAiPsw7e3427SzvQsFu2sdubjbZHDQdqYXN6x3hTDCrG5bZFEhB'
          'changeAccount': 'xpub6FD59hfbH1UWRrY38bVLPPLPLxcA1XBqsQgB95AgsSWngxbwqPBMd5Z3of8PNicLwE9peQ9g4SeWWtBTzUKLwfjSioAg73RRh7dJ5rWYxM7'
      } ]
    } ]

  beforeEach ->
    MyWallet =
      syncWallet: (success, error) ->
        if success
          success()
      get_history: () ->

    Address =
      new: (label) ->
        if Address.shouldThrow
          throw ""
        addr = {
          label: label
          encrypt: () ->
            {
              persist: () ->
            }
        }
        spyOn(addr, "encrypt").and.callThrough()
        addr

    HDWallet =
      new: (cipher) ->
        if HDWallet.shouldThrow
          throw ""
        {
          newAccount: () ->
        }

    Helpers =
      isInstanceOf: (candidate, theClass) ->
        candidate.label != undefined || typeof(candidate) == "object"

    walletStoreTxs = []
    WalletStore = {
      pushTransaction: (tx)  -> walletStoreTxs.push(tx)
      getTransactions: ()    -> walletStoreTxs
      getTransaction: (hash) -> walletStoreTxs.filter(
        (tx) -> tx.hash == hash
      )[0]
    }

    stubs = {
      './wallet'  : MyWallet,
      './address' : Address,
      './helpers' : Helpers,
      './hd-wallet': HDWallet,
      './wallet-store' : WalletStore
    }
    Wallet = proxyquire('../src/blockchain-wallet', stubs)

    spyOn(MyWallet, "syncWallet").and.callThrough()
    spyOn(MyWallet, "get_history").and.callThrough()

  describe "Constructor", ->

    it "should create an empty Wallet with default options", ->
      wallet = new Wallet()
      expect(wallet.double_encryption).toBeFalsy()
      expect(wallet._totalSent).toEqual(0)
      expect(wallet._totalReceived).toEqual(0)
      expect(wallet._finalBalance).toEqual(0)

    it "should transform an Object to a Wallet", ->
      Wallet = proxyquire('../src/blockchain-wallet', {})
      wallet = new Wallet(object)

      expect(wallet._guid).toEqual(object.guid)
      expect(wallet._sharedKey).toEqual(object.sharedKey)
      expect(wallet._double_encryption).toEqual(object.double_encryption)
      expect(wallet._dpasswordhash).toEqual(object.dpasswordhash)
      expect(wallet._pbkdf2_iterations).toEqual(object.options.pbkdf2_iterations)
      expect(wallet._logout_time).toEqual(object.options.logout_time)
      expect(wallet._address_book['1dice8EMZmqKvrGE4Qc9bUFf9PX3xaYDp']).toEqual('SatoshiDice')

  describe "instance", ->
    beforeEach ->
      wallet = new Wallet(object)

    describe "Setter", ->

      it "guid is read only", ->
        wallet.guid = "not allowed"
        expect(wallet.guid).not.toEqual("not allowed")

      it "sharedKey is read only", ->
        wallet.sharedKey = "not allowed"
        expect(wallet.sharedKey).not.toEqual("not allowed")

      it "isDoubleEncrypted is read only", ->
        wallet.isDoubleEncrypted = "not allowed"
        expect(wallet.isDoubleEncrypted).not.toEqual("not allowed")

      it "dpasswordhash is read only", ->
        wallet.dpasswordhash = "not allowed"
        expect(wallet.dpasswordhash).not.toEqual("not allowed")

      it "fee_per_kb  should throw exception if is non-number set", ->
        wrongSet = () -> wallet.fee_per_kb  = "failure"
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "fee_per_kb should throw expection if set to high", ->
        invalid = () -> wallet.fee_per_kb = 100000000
        expect(invalid).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "fee_per_kb should be set to the value sent", ->
        invalid = () -> wallet.fee_per_kb = 10000
        expect(invalid).not.toThrow()
        expect(MyWallet.syncWallet).toHaveBeenCalled()
        expect(wallet.fee_per_kb).toEqual(10000)

      it "pbkdf2_iterations is read only", ->
        wallet.pbkdf2_iterations = "not allowed"
        expect(wallet.pbkdf2_iterations).not.toEqual("not allowed")

      it "totalSent should throw exception if is non-number set", ->
        wrongSet = () -> wallet.totalSent = "failure"
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "totalReceived should throw exception if is non-number set", ->
        wrongSet = () -> wallet.totalReceived = "failure"
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "finalBalance should throw exception if is non-number set", ->
        wrongSet = () -> wallet.finalBalance = "failure"
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "numberTxTotal should throw exception if is non-number set", ->
        wrongSet = () -> wallet.numberTxTotal = "failure"
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "addresses is read only", ->
        wallet.addresses = "not allowed"
        expect(wallet.addresses).not.toEqual("not allowed")

      it "activeAddresses is read only", ->
        wallet.activeAddresses = "not allowed"
        expect(wallet.activeAddresses).not.toEqual("not allowed")

      it "key is read only", ->
        wallet.key = "not allowed"
        expect(wallet.key).not.toEqual("not allowed")

      it "activeKey is read only", ->
        wallet.activeKey = "not allowed"
        expect(wallet.activeKey).not.toEqual("not allowed")

      it "keys is read only", ->
        wallet.keys = "not allowed"
        expect(wallet.keys).not.toEqual("not allowed")

      it "activeKeys is read only", ->
        wallet.activeKeys = "not allowed"
        expect(wallet.activeKeys).not.toEqual("not allowed")

      it "hdwallet is read only", ->
        wallet.hdwallet = "not allowed"
        expect(wallet.hdwallet).not.toEqual("not allowed")

      it "isUpgradedToHD is read only", ->
        wallet.isUpgradedToHD = "not allowed"
        expect(wallet.isUpgradedToHD).not.toEqual("not allowed")

      it "balanceActiveLegacy is read only", ->
        wallet.balanceActiveLegacy = "not allowed"
        expect(wallet.balanceActiveLegacy).not.toEqual("not allowed")

      it "addressBook is read only", ->
        wallet.addressBook = "not allowed"
        expect(wallet.addressBook).not.toEqual("not allowed")

      it "logoutTime should throw exception if is non-number set", ->
        wrongSet = () -> wallet.logoutTime = "failure"
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "logoutTime should throw exception if is out of range set", ->
        wrongSet = () -> wallet.logoutTime = 59000
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "logoutTime should throw exception if is out of range set", ->
        wrongSet = () -> wallet.logoutTime = 86400002
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "logoutTime should be set and sync", ->
        wallet.logoutTime = 100000
        expect(wallet.logoutTime).toEqual(100000)
        expect(MyWallet.syncWallet).toHaveBeenCalled()

    describe "Getter", ->

      it "guid", ->
        expect(wallet.guid).toEqual(object.guid)

      it "sharedKey", ->
        expect(wallet.sharedKey).toEqual(object.sharedKey)

      it "isDoubleEncrypted", ->
        expect(wallet.isDoubleEncrypted).toEqual(object.double_encryption)

      it "dpasswordhash", ->
        expect(wallet.dpasswordhash).toEqual(object.dpasswordhash)

      it "pbkdf2_iterations", ->
        expect(wallet.pbkdf2_iterations).toEqual(object.options.pbkdf2_iterations)

      it "totalSent", ->
        wallet.totalSent = 101
        expect(wallet.totalSent).toEqual(101)

      it "totalReceived", ->
        wallet.totalReceived = 101
        expect(wallet.totalReceived).toEqual(101)

      it "finalBalance", ->
        wallet.finalBalance = 101
        expect(wallet.finalBalance).toEqual(101)

      it "numberTxTotal", ->
        wallet.numberTxTotal = 101
        expect(wallet.numberTxTotal).toEqual(101)

      it "addresses", ->
        expect(wallet.addresses).toEqual(['1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv', '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9', '1H8Cwvr3Vq9rJBGEoudG1AeyeAezr38j8h'])

      it "activeAddresses", ->
        expect(wallet.activeAddresses).toEqual(['1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv', '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9'])

      it "keys", ->
        ad = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv'
        expect(wallet.keys[0].address).toEqual(ad)

      it "key", ->
        ad = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv'
        expect(wallet.key(ad).address).toEqual(ad)

      it "activeKeys", ->
        expect(wallet.activeKeys.length).toEqual(2)

      it "activeKey", ->
        ad = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv'
        expect(wallet.activeKey(ad).address).toEqual(ad)

        archived = '1H8Cwvr3Vq9rJBGEoudG1AeyeAezr38j8h'
        expect(wallet.activeKey(archived)).toEqual(null)

      it "hdwallet", ->
        expect(wallet.hdwallet).toBeDefined()

      it "isUpgradedToHD", ->
        expect(wallet.isUpgradedToHD).toBeTruthy()

      it "balanceActiveLegacy with active", ->
        wallet.keys[0].balance = 101
        expect(wallet.balanceActiveLegacy).toEqual(101)

      it "balanceActiveLegacy without active", ->
        wallet.keys[0].balance = 101
        wallet.keys[0]._tag = 2;
        expect(wallet.balanceActiveLegacy).toEqual(0)

      it "defaultPbkdf2Iterations", ->
        expect(wallet.defaultPbkdf2Iterations).toEqual(5000)

      it "spendableActiveAddresses", ->
        expect(wallet.spendableActiveAddresses.length).toEqual(1)

    describe "Method", ->
      it ".containsLegacyAddress should find address", ->
        adr = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv'
        expect(wallet.containsLegacyAddress(adr)).toBeTruthy()

      it ".containsLegacyAddress should find key", ->
        key = wallet.keys[0]
        expect(wallet.containsLegacyAddress(key)).toBeTruthy()

      it ".containsLegacyAddress should not find address or key", ->
        adr = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCXXX'
        find1 = wallet.containsLegacyAddress(adr)
        expect(find1).toBeFalsy()

      it ".importLegacyAddress", ->
        pending()

      describe ".new", ->
        cb =
          success: () ->
          error: () ->

        beforeEach ->
          spyOn(cb, "success")
          spyOn(cb, "error")

        it "should successCallback for non-hd", ->
          Wallet.new("GUID","SHARED-KEY","ACC-LABEL", cb.success, cb.error, false)
          expect(cb.success).toHaveBeenCalled()

        it "should successCallback for hd", ->
          Wallet.new("GUID","SHARED-KEY","ACC-LABEL", cb.success, cb.error, true)
          expect(cb.success).toHaveBeenCalled()

        describe "(error control)", ->
          it "should errorCallback if non-HD and address generation fail", ->
            Address.shouldThrow = true
            Wallet.new("GUID","SHARED-KEY","ACC-LABEL", cb.success, cb.error, false)
            expect(cb.error).toHaveBeenCalled()

          it "should errorCallback if HD and seed generation fail", ->
            HDWallet.shouldThrow = true
            Wallet.new("GUID","SHARED-KEY","ACC-LABEL", cb.success, cb.error, true)
            expect(cb.error).toHaveBeenCalled()

      describe ".newLegacyAddress", ->
        callbacks =
          success: () ->
          error: () ->

        beforeEach ->
          spyOn(callbacks, "success")
          spyOn(callbacks, "error")

        describe "without second password", ->
          it "should add the address and sync", ->
            wallet.newLegacyAddress("label")
            newAdd = wallet.keys[wallet.keys.length - 1]
            expect(newAdd).toBeDefined()
            expect(MyWallet.syncWallet).toHaveBeenCalled()

          it "should successCallback", ->
            wallet.newLegacyAddress("label", null, callbacks.success, callbacks.error)
            expect(callbacks.success).toHaveBeenCalled()

          it "should errorCallback if Address.new throws", ->
            # E.g. when there is a network error RNG throws,
            # which in turn causes Address.new to throw.
            Address.shouldThrow = true
            wallet.newLegacyAddress("label", null, callbacks.success, callbacks.error)
            expect(callbacks.error).toHaveBeenCalled()

        describe "with second password", ->
          beforeEach ->
            wallet._double_encryption = true

          it "should require the 2nd pwd", ->
            expect(() -> wallet.newLegacyAddress("label")).toThrow()

          it "should call encrypt", ->
            wallet.newLegacyAddress("label", "1234")
            newAdd = wallet.keys[wallet.keys.length - 1]
            expect(newAdd.encrypt).toHaveBeenCalled()

          it "should add the address and sync", ->
            wallet.newLegacyAddress("label", "1234")
            newAdd = wallet.keys[wallet.keys.length - 1]
            expect(newAdd).toBeDefined()
            expect(MyWallet.syncWallet).toHaveBeenCalled()


      it ".deleteLegacyAddress", ->
        wallet.deleteLegacyAddress(wallet.keys[0])
        expect(wallet.keys.length).toEqual(2)
        expect(MyWallet.syncWallet).toHaveBeenCalled()

      it ".validateSecondPassword", ->
        pending()

      describe ".encrypt", ->
        cb =
          success: () ->
          error: () ->
          encrypting: () ->
          syncing: () ->

        beforeEach ->
          spyOn(cb, "success")
          spyOn(cb, "error")
          spyOn(cb, "encrypting")
          spyOn(cb, "syncing")

        it "should encrypt a non encrypted wallet", ->
          wallet.encrypt("batteryhorsestaple", cb.success, cb.error, cb.encrypting, cb.syncing)
          expect(wallet.isDoubleEncrypted).toBeTruthy()
          expect(cb.success).toHaveBeenCalled()
          expect(cb.syncing).toHaveBeenCalled()
          expect(cb.encrypting).toHaveBeenCalled()
          expect(cb.error).not.toHaveBeenCalled()

      it ".decrypt", ->
        pending()

      it ".restoreHDWallet", ->
        pending()

      describe ".newHDWallet", ->
        cb =
          success: () ->
          error: () ->

        beforeEach ->
          spyOn(cb, "success")
          spyOn(cb, "error")
          spyOn(wallet, "newAccount").and.callFake(()->)

        it "should successCallback", ->
          wallet.newHDWallet("ACC-LABEL", null, cb.success, cb.error)
          expect(cb.success).toHaveBeenCalled()

        it "should errorCallback if HDWallet.new fails", ->
          spyOn(HDWallet, "new").and.callFake(() -> raise("RNG failed") )
          wallet.newHDWallet("ACC-LABEL", null, cb.success, cb.error)
          expect(cb.error).toHaveBeenCalled()

      it ".newAccount", ->
        pending()

      it ".getPaidTo", ->
        pending()

      it ".getAddressBookLabel", ->
        pending()

      it ".getNote", ->
        pending()

      it ".setNote", ->
        pending()

      it ".deleteNote", ->
        pending()

      it ".getMnemonic", ->
        pending()

      describe ".changePbkdf2Iterations", ->
        it "should be change the number of iterations when called correctly", ->
          wallet.changePbkdf2Iterations(10000, null)
          expect(MyWallet.syncWallet).toHaveBeenCalled()
          expect(wallet.pbkdf2_iterations).toEqual(10000)

        it "should do nothing when called with the number of iterations it already has", ->
          wallet.changePbkdf2Iterations(5000, null)
          expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it ".getPrivateKeyForAddress", ->
        pending()

    describe "_updateWalletInfo()", ->
      multiaddr = {
        wallet:
          total_sent: 1
          total_received: 0
          final_balance: 0
          n_tx: 1
        addresses: [
          {
              address:"1CzYCAAi46b8CFiybd3CcGbUykCAeqaocj",
              n_tx:1,
              total_received: 0,
              total_sent: 1,
              final_balance: 0
          }
        ]
        txs: [
          {
            hash: "1234"
          }
        ]
        info:
          latest_block: 300000
      }
      beforeEach ->
        spyOn(WalletStore, "pushTransaction").and.callThrough()

      it "should add a new transaction", ->
        # should watch for txlist pushtxs
        pending()
        # wallet._updateWalletInfo(multiaddr)
        # expect(WalletStore.pushTransaction).toHaveBeenCalled()

      it "should not add a duplicate transaction", ->
        pending()
        # missing mocks and probably this should be tested on txList object
        # wallet._updateWalletInfo(multiaddr)
        # wallet._updateWalletInfo(multiaddr)
        # expect(wallet.txList.fetched).toEqual(1)

    describe "JSON serialization", ->

      it 'should hold: fromJSON . toJSON = id', ->
        json1     = JSON.stringify(wallet, null, 2)
        rwall = JSON.parse(json1, Wallet.reviver)
        json2     = JSON.stringify(rwall, null, 2)
        expect(json1).toEqual(json2)
