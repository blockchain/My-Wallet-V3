proxyquire = require('proxyquireify')(require)
MyWallet   = undefined
Address    = undefined
Wallet     = undefined
HDWallet   = undefined
WalletStore = undefined
BlockchainSettingsAPI = undefined

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
      setSyncPubKeys: (boolean) ->
    }

    BlockchainSettingsAPI = {
      shouldFail: false
      enableEmailReceiveNotifications: (success, error) ->
        if BlockchainSettingsAPI.shouldFail
          error()
        else
          success()

      disableAllNotifications: (success, error) ->
        if BlockchainSettingsAPI.shouldFail
          error()
        else
          success()

    }

    stubs = {
      './wallet'  : MyWallet,
      './address' : Address,
      './helpers' : Helpers,
      './hd-wallet': HDWallet,
      './wallet-store' : WalletStore,
      './blockchain-settings-api': BlockchainSettingsAPI,
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


      describe ".deleteLegacyAddress", ->

        it "should delete existing legacy addresses", ->
          expect(wallet.deleteLegacyAddress(wallet.keys[0])).toBeTruthy()
          expect(wallet.keys.length).toEqual(2)
          expect(MyWallet.syncWallet).toHaveBeenCalled()

        it "should do nothing when trying to delete non existing legacy addresses", ->
          expect(wallet.keys.length).toEqual(3)
          expect(wallet.deleteLegacyAddress(Address.new("testing"))).toBeFalsy()
          expect(wallet.keys.length).toEqual(3)
          expect(MyWallet.syncWallet).not.toHaveBeenCalled()

        it "should do nothing with bad arguments", ->
          expect(wallet.keys.length).toEqual(3)
          expect(wallet.deleteLegacyAddress("1KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEb")).toBeFalsy()
          expect(wallet.keys.length).toEqual(3)
          expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it ".validateSecondPassword", ->
        wallet.encrypt("batteryhorsestaple")
        expect(wallet.isDoubleEncrypted).toBeTruthy()
        expect(wallet.validateSecondPassword("batteryhorsestaple")).toBeTruthy()

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

        it "should not encrypt an already encrypted wallet", ->
          wallet.encrypt("batteryhorsestaple")
          wallet.encrypt("batteryhorsestaple", cb.success, cb.error, cb.encrypting, cb.syncing)
          expect(wallet.isDoubleEncrypted).toBeTruthy()
          expect(cb.success).not.toHaveBeenCalled()
          expect(cb.syncing).not.toHaveBeenCalled()
          expect(cb.encrypting).toHaveBeenCalled()
          expect(cb.error).not.toHaveBeenCalled()

      it ".decrypt", ->
        cb =
          success: () ->
          error: () ->
          decrypting: () ->
          syncing: () ->

        beforeEach ->
          spyOn(cb, "success")
          spyOn(cb, "error")
          spyOn(cb, "decrypting")
          spyOn(cb, "syncing")

        it "should decrypt an encrypted wallet", ->
          wallet.encrypt("batteryhorsestaple")
          expect(wallet.isDoubleEncrypted).toBeTruthy()
          wallet.decrypt("batteryhorsestaple", cb.success, cb.error, cb.decrypting, cb.syncing)
          expect(cb.success).toHaveBeenCalled()
          expect(cb.syncing).toHaveBeenCalled()
          expect(cb.decrypting).toHaveBeenCalled()
          expect(cb.error).not.toHaveBeenCalled()
          expect(wallet.isDoubleEncrypted).toBeFalsy()
          expect(MyWallet.syncWallet).toHaveBeenCalled()

        it "should not decrypt an already decrypted wallet", ->
          expect(wallet.isDoubleEncrypted).toBeFalsy()
          wallet.decrypt("batteryhorsestaple", cb.success, cb.error, cb.decrypting, cb.syncing)
          expect(cb.success).not.toHaveBeenCalled()
          expect(cb.syncing).not.toHaveBeenCalled()
          expect(cb.decrypting).toHaveBeenCalled()
          expect(cb.error).not.toHaveBeenCalled()

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

      describe ".newAccount", ->
        cb =
          success: () ->

        beforeEach ->
          spyOn(cb, "success")

        it "should do nothing for a wallet that hasn't been upgraded", ->
          wallet = new Wallet()
          expect(wallet.newAccount("Coffee fund")).toBeFalsy()

        it "should use the first hdwallet if no index is provided", ->
          expect(wallet.newAccount("Coffee fund")).toEqual(wallet._hd_wallets[0].lastAccount)
          expect(MyWallet.syncWallet).toHaveBeenCalled()

        it "should call the success callback if provided", ->
          wallet.newAccount("Coffee fund", undefined, 0, cb.success)
          expect(cb.success).toHaveBeenCalled()
          expect(MyWallet.syncWallet).toHaveBeenCalled()

        it "should not call syncWallet if nosave is set to true", ->
          wallet.newAccount("Coffee fund", undefined, 0, cb.success, true)
          expect(MyWallet.syncWallet).not.toHaveBeenCalled()

        it "should work with encrypted wallets", ->
          wallet.encrypt("batteryhorsestaple")
          wallet.newAccount("Coffee fund", "batteryhorsestaple", 0, cb.success)
          expect(cb.success).toHaveBeenCalled()
          expect(MyWallet.syncWallet).toHaveBeenCalled()

      it ".getPaidTo", ->
        pending()

      describe "addressbook label", ->

        it "should be set, persisted and deleted", ->
          expect(wallet.getAddressBookLabel("1hash")).toEqual(undefined)

          wallet.addAddressBookEntry("1hash", "Rent payment")
          expect(MyWallet.syncWallet).toHaveBeenCalled()

          expect(wallet.getAddressBookLabel("1hash")).toEqual("Rent payment")

          wallet.removeAddressBookEntry("1hash")
          expect(MyWallet.syncWallet).toHaveBeenCalled()

          expect(wallet.getAddressBookLabel("hash")).toEqual(undefined)

      describe "notes", ->

        it "should be set, persisted and deleted", ->
          expect(wallet.getNote("hash")).toEqual(undefined)

          wallet.setNote("hash", "Rent payment")
          expect(MyWallet.syncWallet).toHaveBeenCalled()

          expect(wallet.getNote("hash")).toEqual("Rent payment")

          wallet.deleteNote("hash")
          expect(MyWallet.syncWallet).toHaveBeenCalled()

          expect(wallet.getNote("hash")).toEqual(undefined)

      describe ".getMnemonic", ->
        it "should return the mnemonic if the wallet is not encrypted", ->
          expect(wallet.getMnemonic()).toEqual("lawn couch clay slab oxygen vicious denial couple ski alley spawn wisdom")

        it "should fail to return the mnemonic if the wallet is encrypted and the provided password is wrong", ->
          wallet.encrypt("test")
          expect(() -> wallet.getMnemonic("nottest")).toThrow()

        it "should return the mnemonic if the wallet is encrypted", ->
          wallet.encrypt("test")
          expect(wallet.getMnemonic("test")).toEqual("lawn couch clay slab oxygen vicious denial couple ski alley spawn wisdom")

      describe ".changePbkdf2Iterations", ->
        it "should be change the number of iterations when called correctly", ->
          wallet.changePbkdf2Iterations(10000, null)
          expect(MyWallet.syncWallet).toHaveBeenCalled()
          expect(wallet.pbkdf2_iterations).toEqual(10000)

        it "should do nothing when called with the number of iterations it already has", ->
          wallet.changePbkdf2Iterations(5000, null)
          expect(MyWallet.syncWallet).not.toHaveBeenCalled()

        it "should work with a double encrypted wallet", ->
          wallet.encrypt("batteryhorsestaple")
          expect(wallet.isDoubleEncrypted).toBeTruthy()
          wallet.changePbkdf2Iterations(10000, "batteryhorsestaple")
          expect(MyWallet.syncWallet).toHaveBeenCalled()
          wallet.decrypt("batteryhorsestaple")
          expect(wallet.pbkdf2_iterations).toEqual(10000)

      describe ".getPrivateKeyForAddress", ->
        it "should work for non double encrypted wallets", ->
          expect(wallet.isDoubleEncrypted).toBeFalsy()
          expect(wallet.getPrivateKeyForAddress(wallet.keys[0])).toEqual('HUFhy1SvLBzzdAYpwD3quUN9kxqmm9U3Y1ZDdwBhHjPH')

        it "should work for double encrypted wallets", ->
          wallet.encrypt("batteryhorsestaple")
          expect(wallet.isDoubleEncrypted).toBeTruthy()
          expect(wallet.getPrivateKeyForAddress(wallet.keys[0], "batteryhorsestaple")).toEqual('HUFhy1SvLBzzdAYpwD3quUN9kxqmm9U3Y1ZDdwBhHjPH')

        it "should return null for watch-only addresses in non double encrypted wallets", ->
          expect(wallet.isDoubleEncrypted).toBeFalsy()
          expect(wallet.keys[1].isWatchOnly).toBeTruthy()
          expect(wallet.getPrivateKeyForAddress(wallet.keys[1])).toEqual(null)

        it "should return null for watch-only addresses in for double encrypted wallets", ->
          wallet.encrypt("batteryhorsestaple")
          expect(wallet.isDoubleEncrypted).toBeTruthy()
          expect(wallet.keys[1].isWatchOnly).toBeTruthy()
          expect(wallet.getPrivateKeyForAddress(wallet.keys[1], "batteryhorsestaple")).toEqual(null)

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

    describe "_getPrivateKey", ->

      it "should not compute private keys for non existent accounts", ->
        expect(() -> wallet._getPrivateKey(-1, 'm/0/1')).toThrow()

      it "should not compute private keys for invalid paths accounts", ->
        expect(() -> wallet._getPrivateKey(0, 10)).toThrow()

      it "should compute correct private keys with an unencrypted wallet", ->
        expect(wallet._getPrivateKey(0, 'M/0/14')).toEqual('KzP1z5HqMg5KAjgoqnkpszjXHo3bCnjxGAdb59fnE2bkSqfCTdyR')

      it "should fail if encrypted and second password false", ->
        wallet.encrypt("batteryhorsestaple")

        expect(() -> wallet._getPrivateKey(0, 'M/0/14', 'batteryhorsestaple0')).toThrow()

      it "should compute correct private keys with an encrypted wallet", ->
        wallet.encrypt("batteryhorsestaple")

        expect(wallet._getPrivateKey(0, 'M/0/14', 'batteryhorsestaple')).toEqual('KzP1z5HqMg5KAjgoqnkpszjXHo3bCnjxGAdb59fnE2bkSqfCTdyR')

    describe "notifications", ->
      cb =
        success: () ->
        error: () ->

      beforeEach ->
        spyOn(cb, "success")
        spyOn(cb, "error")
        spyOn(WalletStore, "setSyncPubKeys")
        BlockchainSettingsAPI.shouldFail = false

      describe ".enableNotifications", ->

        it "should require success and error callbacks", ->
          expect(() -> wallet.enableNotifications()).toThrow()
          expect(() -> wallet.enableNotifications(cb.success)).toThrow()
          expect(() -> wallet.enableNotifications(cb.success, cb.error)).not.toThrow()

        it "should call setSyncPubKeys and syncWallet if successful", ->
          wallet.enableNotifications(cb.success, cb.error)
          expect(MyWallet.syncWallet).toHaveBeenCalled()
          expect(WalletStore.setSyncPubKeys).toHaveBeenCalledWith(true)
          expect(cb.success).toHaveBeenCalled()
          expect(cb.error).not.toHaveBeenCalled()

        it "should not call setSyncPubKeys and syncWallet if successful", ->
          BlockchainSettingsAPI.shouldFail = true
          wallet.enableNotifications(cb.success, cb.error)
          expect(MyWallet.syncWallet).not.toHaveBeenCalled()
          expect(WalletStore.setSyncPubKeys).not.toHaveBeenCalled()
          expect(cb.success).not.toHaveBeenCalled()
          expect(cb.error).toHaveBeenCalled()

      describe ".disableNotifications", ->

        it "should require success and error callbacks", ->
          expect(() -> wallet.disableNotifications()).toThrow()
          expect(() -> wallet.disableNotifications(cb.success)).toThrow()
          expect(() -> wallet.disableNotifications(cb.success, cb.error)).not.toThrow()

        it "should call setSyncPubKeys and syncWallet if successful", ->
          wallet.disableNotifications(cb.success, cb.error)
          expect(MyWallet.syncWallet).toHaveBeenCalled()
          expect(WalletStore.setSyncPubKeys).toHaveBeenCalledWith(false)
          expect(cb.success).toHaveBeenCalled()
          expect(cb.error).not.toHaveBeenCalled()

        it "should not call setSyncPubKeys and syncWallet if successful", ->
          BlockchainSettingsAPI.shouldFail = true
          wallet.disableNotifications(cb.success, cb.error)
          expect(MyWallet.syncWallet).not.toHaveBeenCalled()
          expect(WalletStore.setSyncPubKeys).not.toHaveBeenCalled()
          expect(cb.success).not.toHaveBeenCalled()
          expect(cb.error).toHaveBeenCalled()