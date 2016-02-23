
proxyquire = require('proxyquireify')(require)

tx = require('./data/transactions')["default"]

TransactionList = proxyquire('../src/transaction-list', {
  './wallet-transaction': {
    factory: (tx) -> tx
  }
})

describe 'TransactionList', ->
  txList = undefined

  beforeEach ->
    txList = new TransactionList(10)

  it 'should lookup a transaction by its hash', ->
    txList.pushTxs({ hash: 'abcdef', txType: 'sent' })
    tx = txList.transaction('abcdef')
    expect(tx.txType).toEqual('sent')

  it 'should add txs to the tx list', ->
    txList.pushTxs({ txType: 'sent' })
    expect(txList.transactions.length).toEqual(1)

  it 'should not add duplicate txs to the tx list', ->
    txList.pushTxs({ txType: 'sent', hash: "1234"})
    txList.pushTxs({ txType: 'sent', hash: "1234"})
    expect(txList.transactions().length).toEqual(1)

  it "should have defined its load number", ->
    expect(txList.loadNumber).toEqual(10)


  describe 'events', ->
    spy = undefined
    unsub = undefined

    beforeEach ->
      spy = jasmine.createSpy()
      unsub = txList.subscribe(spy)

    it 'should send event listeners an update when pushTxs is called', ->
      txList.pushTxs({ txType: 'sent' })
      expect(spy).toHaveBeenCalled()

    it 'should have the ability to unsubscribe', ->
      unsub()
      txList.pushTxs({ txType: 'sent' })
      expect(spy).not.toHaveBeenCalled()

  describe ".wipe", ->

    it "should empty the list", ->
      txList.wipe()
      expect(txList.transactions().length).toEqual(0)
