let API = require('../src/api');

describe('API', () => {
  describe('encodeFormData', () => {
    it('should encode a flat list', () => {
      let data = { foo: 'bar', alice: 'bob' };
      expect(API.encodeFormData(data)).toEqual('foo=bar&alice=bob');
    });

    it('should encode a nested list', () => {
      pending();
      let data = {
        foo: 'bar',
        name: { first: 'bob' }
      };
      expect(API.encodeFormData(data)).toEqual('...');
    });
  });

  describe('calcBtcEthUsageCounterId', () => {
    // values: BTC Balance, ETH Balance, BTC Txs, Eth Txs
    const fixtures = [
      { id: 0, values: [0, 0, 0, 0] },
      { id: 1, values: [0, 0, 0, 1] },
      { id: 2, values: [0, 0, 1, 0] },
      { id: 3, values: [0, 0, 1, 1] },
      { id: 4, values: [0, 1, 0, 0] },
      { id: 5, values: [0, 1, 0, 1] },
      { id: 6, values: [0, 1, 1, 0] },
      { id: 7, values: [0, 1, 1, 1] },
      { id: 8, values: [1, 0, 0, 0] },
      { id: 9, values: [1, 0, 0, 1] },
      { id: 10, values: [1, 0, 1, 0] },
      { id: 11, values: [1, 0, 1, 1] },
      { id: 12, values: [1, 1, 0, 0] },
      { id: 13, values: [1, 1, 0, 1] },
      { id: 14, values: [1, 1, 1, 0] },
      { id: 15, values: [1, 1, 1, 1] }
    ];

    let symbol = (val) => val === 0 ? '== 0' : '> 0';

    let renderValues = ([btcBal, ethBal, btcTxs, ethTxs]) => (
      `BTC Balance ${symbol(btcBal)}, ETH Balance ${symbol(ethBal)}, BTC Txs ${symbol(btcTxs)}, and ETH Txs ${symbol(ethTxs)}`
    );

    fixtures.forEach(({ id, values }) => {
      it(`should produce counter id = ${id} with ${renderValues(values)}`, () => {
        expect(API.calcBtcEthUsageCounterId.apply(API, values)).toEqual(id);
      });
    });
  });
});
