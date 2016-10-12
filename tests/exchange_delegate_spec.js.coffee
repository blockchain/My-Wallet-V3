proxyquire = require('proxyquireify')(require)

delegate = undefined

trade = undefined

acc0 = {
  labels: {}
  receiveIndex: 0
  receivingAddressesLabels: []
  receiveAddressAtIndex: (i) -> "0-" + i
  getLabelForReceivingAddress: (i) ->
    this.labels[i]
  setLabelForReceivingAddress: (i, label) ->
    this.labels[i] = label
  removeLabelForReceivingAddress: (i) ->
    this.labels[i] = undefined
}

MyWallet = {
  wallet: {
    hdwallet: {
      accounts: [
        acc0
      ]
      defaultAccount: acc0
    }
    accountInfo:
      email: 'info@blockchain.com'
      mobile: '+1 55512341234'
      isEmailVerified: true
      isMobileVerified: true
    external:
      save: () ->
  }
}

emailVerified = true
mobileVerified = true

API =
  getBalances: () ->
  getHistory: (addresses) ->
    if addresses.indexOf('address-with-tx') > -1
      Promise.resolve({txs: [{hash: 'hash', block_height: 11}]})
    else
      Promise.resolve({txs: []})

  request: (action, method, data, headers) ->
    return new Promise (resolve, reject) ->
      if action == 'GET' && method == "wallet/signed-token"
        if emailVerified && data.fields == 'email'
          resolve({success: true, token: 'json-web-token-email'})
        if emailVerified && data.fields == 'mobile'
          resolve({success: true, token: 'json-web-token-mobile'})
        if emailVerified && data.fields == 'email|mobile'
          resolve({success: true, token: 'json-web-token-email-mobile'})
        else
          resolve({success: false})
      if action == 'GET' && method == "wallet/signed-token"
        if emailVerified && mobileVerified
          resolve({success: true, token: 'json-web-token'})
        else
          resolve({success: false})
      else
        reject('bad call')

eventListener = {
  callback: null
}

WalletStore = {
  addEventListener: (callback) ->
    eventListener.callback = callback

}

TX = (tx) ->
  {
    hash: tx.hash
    confirmations: tx.block_height - 10
  }

stubs = {
  './wallet': MyWallet,
  './api': API,
  './wallet-store': WalletStore,
  './wallet-transaction': TX
}

ExchangeDelegate    = proxyquire('../src/exchange-delegate', stubs)

describe "ExchangeDelegate", ->

  describe "class", ->
    describe "new ExchangeDelegate()", ->
      it "...", ->
        pending()

  describe "instance", ->
    beforeEach ->
      trade = {
        _account_index: 0
      }
      delegate = new ExchangeDelegate(MyWallet.wallet)
      delegate.trades = [trade]

    describe "debug", ->
      it "should set debug", ->
        delegate.debug = true
        expect(delegate.debug).toEqual(true)

    describe "getters", ->
      it "trades should be an array", ->
        expect(delegate.trades.length).toBeDefined()

    describe "save()", ->
      it "should call save on external", ->
        spyOn(MyWallet.wallet.external, "save")
        delegate.save()
        expect(MyWallet.wallet.external.save).toHaveBeenCalled()

    describe "email()", ->
      it "should get the users email", ->
        expect(delegate.email()).toEqual('info@blockchain.com')

      it "should return null if the user doesn't have an email", ->
        MyWallet.wallet.accountInfo.email = null
        expect(delegate.email()).toEqual(null)

    describe "mobile()", ->
      it "should get the users mobile number", ->
        expect(delegate.mobile()).toEqual('+1 55512341234')

      it "should return null if the user doesn't have a mobile number", ->
        MyWallet.wallet.accountInfo.mobile = null
        expect(delegate.mobile()).toEqual(null)

    describe "isEmailVerified()", ->
      it "should be true is users email is verified", ->
        expect(delegate.isEmailVerified()).toEqual(true)

    describe "isMobileVerified()", ->
      it "should be true is users mobile is verified", ->
        expect(delegate.isMobileVerified()).toEqual(true)

    describe "getEmailToken()", ->
      afterEach ->
        emailVerified = true

      it 'should get the token', (done) ->
        promise = delegate.getEmailToken()
        expect(promise).toBeResolvedWith('json-web-token-email', done);

      it 'should reject if email is not verified', (done) ->
        emailVerified = false
        promise = delegate.getEmailToken()
        expect(promise).toBeRejected(done);

    describe "getToken()", ->
      afterEach ->
        emailVerified = true
        mobileVerified = true

      it 'should get the token', (done) ->
        promise = delegate.getToken()
        expect(promise).toBeResolvedWith('json-web-token-email-mobile', done);

      it 'should reject if email is not verified', (done) ->
        emailVerified = false
        promise = delegate.getToken()
        expect(promise).toBeRejected(done);

      it 'should reject if mobile is not verified', (done) ->
        emailVerified = false
        promise = delegate.getToken()
        expect(promise).toBeRejected(done);

    describe "getReceiveAddress()", ->
      it "should get the trades receive address", ->
        trade._account_index = 0
        trade._receive_index = 0
        expect(delegate.getReceiveAddress(trade)).toEqual('0-0')

    describe "reserveReceiveAddress()", ->
      it "should return the first available address", ->
        expect(delegate.reserveReceiveAddress().receiveAddress).toEqual('0-0')

      it "should fail if gap limit", () ->
        MyWallet.wallet.hdwallet.accounts[0].receiveIndex = 19
        MyWallet.wallet.hdwallet.accounts[0].lastUsedReceiveIndex = 0
        delegate.trades = []
        expect(() -> delegate.reserveReceiveAddress()).toThrow(new Error('gap_limit'))

      describe ".commit()", ->
        account = undefined

        beforeEach ->
          account = MyWallet.wallet.hdwallet.accounts[0]
          account.receiveIndex = 0
          account.lastUsedReceiveIndex = 0
          trade = { id: 1, _account_index: 0, _receive_index: 0 }

        it "should label the address", ->
          delegate.trades = []
          reservation = delegate.reserveReceiveAddress()
          reservation.commit(trade)
          expect(account.getLabelForReceivingAddress(0)).toEqual("Exchange order #1")

        it "should allow custom label prefix for each exchange", ->
          delegate.trades = []
          delegate.labelBase = 'Coinify order'
          reservation = delegate.reserveReceiveAddress()
          reservation.commit(trade)
          expect(account.getLabelForReceivingAddress(0)).toEqual("Coinify order #1")

        it "should append to existing label if at gap limit", ->
          delegate.trades = [{ id: 0, _receive_index: 16, receiveAddress: '0-16', state: 'completed' }]
          account.receiveIndex = 19
          reservation = delegate.reserveReceiveAddress()
          reservation.commit(trade)
          expect(account.getLabelForReceivingAddress(16)).toEqual("Exchange order #0, #1")

    describe "releaseReceiveAddress()", ->
      account = undefined

      beforeEach ->
        account = MyWallet.wallet.hdwallet.accounts[0]
        account.receiveIndex = 1
        trade = { id: 1, receiveAddress: '0-16', _account_index: 0, _receive_index: 0}

      it "should remove the label", ->
        account.labels[0] = "Coinify order #1"
        delegate.releaseReceiveAddress(trade)
        expect(account.labels[0]).not.toBeDefined()

      it "should remove one of multible ids in a label", ->
        account.labels[0] = "Coinify order #0, 1"
        delegate.trades =  [{ id: 0, _receive_index: 16, receiveAddress: '0-16', state: 'completed' }]
        delegate.releaseReceiveAddress(trade)
        expect(account.labels[0]).toEqual("Coinify order #0")

    describe "checkAddress()", ->
      it "should resolve with nothing if no transaction is found ", (done) ->
        promise = delegate.checkAddress('address')
        expect(promise).toBeResolvedWith(undefined, done)

      it "should resolve with transaction", (done) ->
        promise = delegate.checkAddress('address-with-tx')
        expect(promise).toBeResolvedWith(jasmine.objectContaining({hash: 'hash', confirmations: 1}), done)

    describe "monitorAddress()", ->
      e =
        callback: () ->

      beforeEach ->
        spyOn(e, 'callback')

      it "should add an eventListener", ->
        spyOn(WalletStore, "addEventListener")
        delegate.monitorAddress()
        expect(WalletStore.addEventListener).toHaveBeenCalled()

      it "should callback if transaction happens on address", ->
        delegate.monitorAddress("1abc", e.callback)

        eventListener.callback('on_tx_received', {
          out: [{
            addr: "1abc"
          }]
        })

        expect(e.callback).toHaveBeenCalled()

      it "should callback if transaction happens on a different address", ->
        e =
          callback: () ->

        spyOn(e, 'callback')

        delegate.monitorAddress("1abc", e.callback)

        eventListener.callback('on_tx_received', {
          out: [{
            addr: "1abcdef"
          }]
        })

        expect(e.callback).not.toHaveBeenCalled()


    describe "serializeExtraFields()", ->
      it "should add receive account and index", ->
        trade = {
          _account_index: 0
          _receive_index: 0
        }
        obj = {}
        delegate.serializeExtraFields(obj, trade)
        expect(obj.account_index).toEqual(0)
        expect(obj.receive_index).toEqual(0)

    describe "deserializeExtraFields()", ->
      it "should set the trades receive account and index", ->
        trade = {
        }
        obj = {
          account_index: 0
          receive_index: 0
        }
        delegate.deserializeExtraFields(obj, trade)
        expect(trade._account_index).toEqual(0)
        expect(trade._receive_index).toEqual(0)
