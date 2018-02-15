
let proxyquire = require('proxyquireify')(require);

let tx = require('./__data__/transactions')['default'];

let TransactionList = proxyquire('../src/transaction-list', {
  './wallet-transaction': {
    factory (tx) { return tx; }
  }
});

describe('TransactionList', () => {
  let txList;

  beforeEach(() => { txList = new TransactionList(10); });

  it('should lookup a transaction by its hash', () => {
    txList.pushTxs({ hash: 'abcdef', txType: 'sent' });
    tx = txList.transaction('abcdef');
    expect(tx.txType).toEqual('sent');
  });

  it('should add txs to the tx list', () => {
    txList.pushTxs({ txType: 'sent' });
    expect(txList.transactions.length).toEqual(1);
  });

  it('should not add duplicate txs to the tx list', () => {
    txList.pushTxs({ txType: 'sent', hash: '1234' });
    txList.pushTxs({ txType: 'sent', hash: '1234' });
    expect(txList.transactions().length).toEqual(1);
    expect(txList.fetched).toEqual(1);
  });

  it('should have defined its load number', () => expect(txList.loadNumber).toEqual(10));

  it('should correctly handle transactions identities', () => {
    let tx1 = {
      hash: '234234',
      txType: 'sent',
      belongsTo (identity) { return identity === 'imported'; }
    };

    let tx2 = {
      hash: '6786',
      txType: 'sent',
      belongsTo (identity) { return identity === '0/1/23'; }
    };

    txList.pushTxs(tx1);
    txList.pushTxs(tx2);
    expect(txList.transactions().length).toEqual(2);
    expect(txList.transactions('').length).toEqual(2);
    expect(txList.transactions('imported').length).toEqual(1);
  });

  describe('events', () => {
    let spy;
    let unsub;

    beforeEach(() => {
      spy = jasmine.createSpy();
      unsub = txList.subscribe(spy);
    });

    it('should send event listeners an update when pushTxs is called', () => {
      txList.pushTxs({ txType: 'sent' });
      expect(spy).toHaveBeenCalled();
    });

    it('should have the ability to unsubscribe', () => {
      unsub();
      txList.pushTxs({ txType: 'sent' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not add things that aren\'t functions as listeners', () => {
      let res = txList.subscribe({garbadge: true});
      expect(res).toEqual(undefined);
    });
  });

  describe('.wipe', () =>

    it('should empty the list', () => {
      txList.wipe();
      expect(txList.transactions().length).toEqual(0);
    })
  );

  describe('transactionsForIOS', () =>

    it('should return all transactions in the correct format', () => {
      txList.pushTxs({ txType: 'sent', hash: '1234' });
      txList.pushTxs({ txType: 'sent', hash: '1234' });
      txList.pushTxs({ txType: 'sent', hash: '3234' });

      let ios = txList.transactionsForIOS();

      expect(ios.length).toEqual(2);
      expect(ios[0].myHash).toEqual('1234');
      expect(ios[1].myHash).toEqual('3234');
      expect(ios[0].txType).toEqual('sent');
      expect(ios[1].txType).toEqual('sent');
    })
  );
});
