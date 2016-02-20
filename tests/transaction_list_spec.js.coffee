
proxyquire = require('proxyquireify')(require)

tx = {
  "ver": 1,
  "inputs": [
    {
      "sequence": 4294967295,
      "prev_out": {
        "spent": true,
        "tx_index": 126405501,
        "type": 0,
        "addr": "1AaFJUs2XY1sGGg7p7ucJSZEJF3zB6r4Eh",
        "value": 10000,
        "xpub": {
          "path": "M/1/15",
          "m": "xpub6DX2ZjB6qgNGSn9tUQ4L13pYzuYxsxhj4rBeVcJeEAKfaLjipFRoexhpjnRJsSkRASubGq3ygkkGUMD7GpVdvXzSkn9pBqMKJ8m2rKuKQqz"
        },
        "n": 0,
        "script": "76a9146902cc077690c73af06881e06db707840d3964ef88ac"
      },
      "script": "483045022100fa415187916382d4350b7f20426a630e5c04f47cfdfb17fd7e1da807cc4d83e802205e924c11f15b3c081deedcb74c539e42abab5ce444c0c6049f03a4c9607c0620012103a6248bd6143706d8524aa0a594d45e0abaed0457bacb8fbbfec012fb75b02811"
    }
  ]
};

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
