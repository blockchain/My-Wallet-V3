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
      isEmailVerified: true
  }
}

emailVerified = true

API =
  getBalances: () ->
  getHistory: (addresses) ->
    if addresses.indexOf('address-with-tx') > -1
      Promise.resolve({txs: [{hash: 'hash', block_height: 11}]})
    else
      Promise.resolve({txs: []})

  request: (action, method, data, headers) ->
    return new Promise (resolve, reject) ->
      if action == 'GET' && method == "wallet/signed-email-token"
        if emailVerified
          resolve({success: true, token: 'json-web-token'})
        else
          resolve({success: false})
      else
        reject('bad call')

WalletStore = {}

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

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    describe "new ExchangeDelegate()", ->
      it "...", ->
        pending()

  describe "instance", ->
    beforeEach ->
      delegate = new ExchangeDelegate(MyWallet.wallet)
      trade = {
        _account_index: 0
      }

    describe "email()", ->
      it "should get the users email", ->
        expect(delegate.email()).toEqual('info@blockchain.com')

      it "should return null if the user doesn't have an email", ->
        MyWallet.wallet.accountInfo.email = null
        expect(delegate.email()).toEqual(null)

    describe "isEmailVerified()", ->
      it "should be true is users email is verified", ->
        expect(delegate.isEmailVerified()).toEqual(true)

    describe "getEmailToken()", ->
      afterEach ->
        emailVerified = true

      it 'should get the token', (done) ->
        promise = delegate.getEmailToken()
        expect(promise).toBeResolvedWith('json-web-token', done);

      it 'should reject if email is not verified', (done) ->
        emailVerified = false
        promise = delegate.getEmailToken()
        expect(promise).toBeRejected(done);

    describe "getReceiveAddress()", ->
      it "should get the trades receive address", ->
        trade._account_index = 0
        trade._receive_index = 0
        expect(delegate.getReceiveAddress(trade)).toEqual('0-0')

    describe "reserveReceiveAddress()", ->
      it "should return the first available address", ->
        expect(delegate.reserveReceiveAddress(trade)).toEqual('0-0')

      it "should fail if gap limit", () ->
        MyWallet.wallet.hdwallet.accounts[0].receiveIndex = 20
        MyWallet.wallet.hdwallet.accounts[0].lastUsedReceiveIndex = 0
        expect(() -> delegate.reserveReceiveAddress(trade)).toThrow(new Error('gap_limit'))

    describe "commitReceiveAddress()", ->
      account = undefined

      beforeEach ->
        account = MyWallet.wallet.hdwallet.accounts[0]
        account.receiveIndex = 0

      it "should label the address", ->
        trade = {
          id: 1
          _account_index: 0
          _receive_index: 0
        }
        delegate.commitReceiveAddress(trade)
        expect(account.getLabelForReceivingAddress(0)).toEqual("Coinify order #1")

    describe "releaseReceiveAddress()", ->
      account = undefined

      beforeEach ->
        account = MyWallet.wallet.hdwallet.accounts[0]
        account.receiveIndex = 1
        account.labels[0] = "Coinify order #1"

        trade = {
          id: 1
          _account_index: 0
          _receive_index: 0
        }

      it "should remove the label", ->
        delegate.releaseReceiveAddress(trade)
        expect(account.labels[0]).not.toBeDefined()

    describe "checkAddress()", ->
      it "should resolve with nothing if no transaction is found ", (done) ->
        promise = delegate.checkAddress('address')
        expect(promise).toBeResolvedWith(undefined, done)

      it "should resolve with transaction", (done) ->
        promise = delegate.checkAddress('address-with-tx')
        expect(promise).toBeResolvedWith(jasmine.objectContaining({hash: 'hash', confirmations: 1}), done)

    describe "monitorAddress()", ->
      it "...", ->
        pending()

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
