proxyquire = require('proxyquireify')(require)

delegate = undefined

trade = undefined

acc0 = {
  receivingAddressesLabels: []
  receiveAddressAtIndex: (i) -> "0-" + i
}

MyWallet = {
  wallet: {
    hdwallet: {
      accounts: [
        acc0
      ]
      defaultAccount: acc0
    }
  }
}

emailVerified = true

API =
  getBalances: () ->
  getHistory: () ->
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

stubs = {
  './wallet': MyWallet,
  './api': API,
  './wallet-store': WalletStore
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
      it "...", ->
        pending()

    describe "isEmailVerified()", ->
      it "...", ->
        pending()

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

    describe "monitorAddress()", ->
      it "...", ->
        pending()

    describe "checkAddress()", ->
      it "...", ->
        pending()

    describe "getReceiveAddress()", ->
      it "...", ->
        pending()

    describe "reserveReceiveAddress()", ->
      it "should fail if gap limit", () ->
        MyWallet.wallet.hdwallet.accounts[0].receiveIndex = 20
        MyWallet.wallet.hdwallet.accounts[0].lastUsedReceiveIndex = 0
        expect(() -> delegate.reserveReceiveAddress(trade)).toThrow(new Error('gap_limit'))

    describe "commitReceiveAddress()", ->
      it "...", ->
        pending()

    describe "releaseReceiveAddress()", ->
      it "...", ->
        pending()

    describe "serializeExtraFields()", ->
      it "...", ->
        pending()

    describe "deserializeExtraFields()", ->
      it "...", ->
        pending()
