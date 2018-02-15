
let proxyquire = require('proxyquireify')(require);

let MyWallet = {
  wallet: {
    getNote (hash) { return null; },
    containsLegacyAddress (addr) { return (addr === '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa') || (addr === '1GpQRQAAMGuQ3AMcivFHDCPnV69qtQ65RZ') || (addr === '16GJsXtwq5JsYDAFaTXGMgj4W178nT3Pqj'); },
    hdwallet: {
      account () { return { index: 0, label: 'Savings' }; }
    },

    key (addr) {
      if (addr === '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa') {
        return { label: 'Genesis', isWatchOnly: true, archived: false };
      } else if (addr === '1GpQRQAAMGuQ3AMcivFHDCPnV69qtQ65RZ') {
        return { label: 'Legacy Addr 1', isWatchOnly: false, archived: false };
      } else if (addr === '16GJsXtwq5JsYDAFaTXGMgj4W178nT3Pqj') {
        return { label: 'Legacy Addr 2', isWatchOnly: false, archived: false };
      }
    },

    latestBlock: { height: 399680 },
    getAddressBookLabel (address) { return 'addressBookLabel'; }
  }
};

let transactions = require('./__data__/transactions');

let Tx = proxyquire('../src/wallet-transaction', {
  './wallet': MyWallet
});

describe('Transaction', () => {
  describe('new', () =>
    it('should create an empty transaction given no argument', () => {
      let tx = new Tx();
      expect(tx.inputs.length).toEqual(0);
      expect(tx.out.length).toEqual(0);
      expect(tx.confirmations).toEqual(0);
    })
  );

  describe('default', () => {
    it('should be recognized', () => {
      let tx = Tx.factory(transactions['default']);
      expect(tx.processedInputs.length).toBe(2);
      expect(tx.processedOutputs.length).toBe(1);
      expect(tx.processedInputs[0].address).toBe('1AaFJUs2XY1sGGg7p7ucJSZEJF3zB6r4Eh');
      expect(tx.fromWatchOnly).toBeTruthy();
      expect(tx.toWatchOnly).toBeFalsy();
      expect(tx.txType).toEqual('sent');
      expect(tx.amount).toEqual(-30000);
      expect(tx.from.address).toEqual('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(tx.to[0].address).toEqual('1M5hoG1pCTDsPqZwG6WH25ziwYYaXNMLrU');
    });

    it('should have a fee equal to the difference between inputs and outputs value', () => {
      let tx = Tx.factory(transactions['default']);

      expect(tx.fee).toEqual(10000);
    });

    it('should have a correct number of confirmations', () => {
      let tx = Tx.factory(transactions['default']);

      expect(tx.confirmations).toEqual(3);
    });

    it('should have correctly tagged outputs', () => {
      let tx = Tx.factory(transactions['default']);
      expect(tx.processedOutputs[0].coinType).toEqual('external');
    });

    it('should have correctly tagged inputs', () => {
      let tx = Tx.factory(transactions['default']);
      expect(tx.processedInputs[0].coinType).toEqual('0/1/15');
      expect(tx.processedInputs[1].coinType).toEqual('legacy');
      expect(tx.belongsTo('imported')).toEqual(true);
    });
  });

  describe('coinbase', () => {
    it('should be recognized', () => {
      let tx = Tx.factory(transactions['coinbase']);
      expect(tx.processedInputs.length).toBe(1);
      expect(tx.processedOutputs.length).toBe(1);
      expect(tx.processedInputs[0].address).toBe('Coinbase');
      expect(tx.processedInputs[0].amount).toBe(100000);
      expect(tx.txType).toEqual('received');
      expect(tx.amount).toEqual(100000);
    });

    it('should have a fee equal to 0', () => {
      let tx = Tx.factory(transactions['coinbase']);

      expect(tx.fee).toEqual(0);
    });
  });

  describe('internal', () => {
    it('should be recognized', () => {
      let tx = Tx.factory(transactions['internal']);
      expect(tx.processedInputs.length).toBe(1);
      expect(tx.processedOutputs.length).toBe(2);
      expect(tx.fromWatchOnly).toBeFalsy();
      expect(tx.toWatchOnly).toBeFalsy();
    });

    it('should have a fee equal to 10000', () => {
      let tx = Tx.factory(transactions['internal']);
      expect(tx.fee).toEqual(10000);
    });

    it('should be categorized as a transfer', () => {
      let tx = Tx.factory(transactions['internal']);
      expect(tx.txType).toEqual('transfer');
      expect(tx.changeAmount).toEqual(10000);
      expect(tx.amount).toEqual(80000);
    });
  });

  describe('from imported address to imported address', () =>
    it('should have the right amount', () => {
      let tx = Tx.factory(transactions['from_imported']);
      expect(tx.processedInputs.length).toBe(1);
      expect(tx.processedOutputs.length).toBe(2);
      expect(tx.fromWatchOnly).toBeFalsy();
      expect(tx.toWatchOnly).toBeFalsy();
      expect(tx.txType).toEqual('transfer');
      expect(tx.fee).toEqual(10000);
      expect(tx.amount).toEqual(4968);
    })
  );

  describe('factory', () =>
    it('should not touch already existing objects', () => {
      let tx = Tx.factory(transactions['coinbase']);
      let fromFactory = Tx.factory(tx);
      expect(tx).toEqual(fromFactory);
    })
  );

  describe('IOSfactory', () =>
    it('should create valid iOS objects', () => {
      let tx = Tx.factory(transactions['default']);
      let ios = Tx.IOSfactory(tx);
      expect(ios.time).toEqual(tx.time);
      expect(ios.result).toEqual(tx.result);
      expect(ios.amount).toEqual(tx.amount);
      expect(ios.confirmations).toEqual(tx.confirmations);
      expect(ios.myHash).toEqual(tx.hash);
      expect(ios.txType).toEqual(tx.txType);
      expect(ios.block_height).toEqual(tx.block_height);
      expect(ios.fromWatchOnly).toEqual(tx.fromWatchOnly);
      expect(ios.toWatchOnly).toEqual(tx.toWatchOnly);
      expect(ios.to).toEqual(tx.to);
      expect(ios.from).toEqual(tx.from);
    })
  );
});
