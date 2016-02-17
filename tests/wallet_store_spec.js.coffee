proxyquire = require('proxyquireify')(require)
MyWallet = {
  wallet: {
    getHistory: () ->
    syncWallet: () ->
  }
}

stubs = {
  './wallet': MyWallet,
}

WalletStore    = proxyquire('../src/wallet-store', stubs)

describe "WalletStore", ->

  beforeEach ->
    spyOn(MyWallet, "syncWallet")
    spyOn(MyWallet.wallet, "getHistory")

  describe "instance", ->
    beforeEach ->

    describe "getTransactions()", ->
      it "should return nothing initially", ->
        expect(WalletStore.getTransactions()).toEqual([])

    describe "pushTransaction()", ->

      it "add a transaction", ->
        tx = {hash: "1234"}
        WalletStore.pushTransaction(tx)
        expect(WalletStore.getTransactions()).toEqual([tx])

    describe "getTransaction()", ->
      it "should return a transaction with the right hash", ->
        tx1 = {hash: "1234"}
        tx2 = {hash: "5678"}

        WalletStore.pushTransaction(tx1)
        WalletStore.pushTransaction(tx2)

        expect(WalletStore.getTransaction("1234")).toEqual(tx1)
        expect(WalletStore.getTransaction("5678")).toEqual(tx2)
