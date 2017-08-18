
let proxyquire = require('proxyquireify')(require);
let unspent = require('./__data__/unspent-outputs');
let fees = require('./__data__/fee-data');
let exchangeMock = require('./__mocks__/bitcoin-exchange-client.mock');

let MyWallet = {
  wallet: {
    fee_per_kb: 10000,
    isUpgradedToHD: true,
    key () { return { priv: null, address: '16SPAGz8vLpP3jNTcP7T2io1YccMbjhkee' }; },
    spendableActiveAddresses: [
      '16SPAGz8vLpP3jNTcP7T2io1YccMbjhkee',
      '1FBHaa3JNjTbhvzMBdv2ymaahmgSSJ4Mis',
      '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9'
    ],
    hdwallet: {
      accounts: [
        {
          receiveAddress: '1CAAZHV1YJcWojefgTEJMG1TjqyEzDuvA6',
          extendedPublicKey: 'xpub6DX2ZjB6qgNH5GFusizVD2yHsm7T9vD6eQNHzth4Zy6MPQim96UPdHurhXDSaz8aUtPo3XktydjkMt1ZJCL9pjPm9YXJYW3K9cYDcJAuT2v'
        },
        {
          receiveAddress: '1K8ChnK2TCpADx6auTDjB613zrf4wBsawx',
          extendedPublicKey: 'xpub6DX2ZjB6qgNH8YVEAX4tKdTGrEyLF5h2FVarCmWvRUpVREYL6c93xvt7ZFGK9x6vNjwiRxAd1pEo2WU5YNKPhnAZ8sh4CUefbGQJ8aUJaEv'
        }
      ]
    }
  }
};

const API = {
  getUnspent (addresses, conf) { return Promise.resolve(unspent); },
  getFees () { return Promise.resolve(fees); },
  getBlockchainAddress () {
    return Promise.resolve(
      { address: '19gPGVysbWPaV65GaVBvEWjQbxSffSeyW1', success: true });
  }
};

let Helpers =
   {guessFee (nInputs, nOutputs, feePerKb) { return nInputs * 100; }};

let Payment = proxyquire('../src/payment', {
  'bitcoin-exchange-client': exchangeMock,
  './wallet': MyWallet,
  './api': API,
  './helpers': Helpers
});

describe('Payment', () => {
  let payment;
  let { hdwallet } = MyWallet.wallet;

  let data = {
    address: '16SPAGz8vLpP3jNTcP7T2io1YccMbjhkee',
    addressesFromPk: ['1Q57STy6daELZqToY4Rs2BKWxau2kzwjdy', '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9'], // Compressed and uncompressed
    addresses: ['16SPAGz8vLpP3jNTcP7T2io1YccMbjhkee', '1FBHaa3JNjTbhvzMBdv2ymaahmgSSJ4Mis', '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9']
  };

  beforeEach(() => {
    payment = new Payment(MyWallet.wallet);
  });

  describe('new', () =>

    it('should create a new payment', done => {
      spyOn(Payment, 'return').and.callThrough();
      payment = new Payment();
      expect(Payment.return).toHaveBeenCalled();
      expect(payment.payment).toBeResolved(done);
    })
  );

  describe('to', () => {
    it('should set an address', done => {
      payment.to(data.address);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ to: [data.address] }), done);
    });

    it('should set multiple addresses', done => {
      payment.to(data.addresses);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ to: data.addresses }), done);
    });

    it('should set to an account index', done => {
      payment.to(1);
      let { receiveAddress } = hdwallet.accounts[1];
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ to: [receiveAddress] }), done);
    });

    it('should not set to an invalid account index', done => {
      payment.to(-1);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ to: null }), done);
    });
  });

  describe('from', () => {
    it('should set to an address ', done => {
      payment.from(data.address);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: [data.address] }), done);
    });

    it('should set multiple addresses', done => {
      payment.from(data.addresses);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: data.addresses }), done);
    });

    it('should set an account index', done => {
      payment.from(0);
      let xpub = hdwallet.accounts[0].extendedPublicKey;
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: [xpub] }), done);
    });

    it('should all addresses if no argument is specified', done => {
      payment.from();
      let legacyAddresses = MyWallet.wallet.spendableActiveAddresses;
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: legacyAddresses }), done);
    });

    it('should set the correct sweep amount and sweep fee', done => {
      payment.from(data.address);
      payment.updateFeePerKb(10);
      payment.payment.then(({sweepAmount, sweepFee}) => {
        expect(sweepAmount).toEqual(16260);
        expect(sweepFee).toEqual(3740);

        done();
      });
    });

    it('should set an address from a private key', done => {
      payment.from('5JrXwqEhjpVF7oXnHPsuddTc6CceccLRTfNpqU2AZH8RkPMvZZu'); // PK for 12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: data.addressesFromPk }), done);
    });

    it('should not set an address from an invalid string', done => {
      payment.from('1badaddresss');
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: null, change: null }), done);
    });
  });

  describe('amount', () => {
    it('should not set negative amounts', done => {
      payment.amount(-1);
      expect(payment.payment).toBeRejected(done);
    });

    it('should not set amounts that aren\'t positive integers', done => {
      payment.amount('100000000');
      expect(payment.payment).toBeRejected(done);
    });

    it('should not set amounts if an element of the array is invalid', done => {
      payment.amount([10000, 20000, 30000, '324345']);
      expect(payment.payment).toBeRejected(done);
    });

    it('should set amounts from a valid number', done => {
      payment.amount(3000);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ amounts: [3000] }), done);
    });

    it('should set amounts from a valid number array', done => {
      payment.amount([3000, 20000]);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ amounts: [3000, 20000] }), done);
    });

    it('should add normal service charge fee', done => {
      let chargeOptions = {
        min_tx_amount: 0,
        max_service_charge: 100000,
        percent: 0.5,
        send_to_miner: true
      };
      payment.amount(10000, null, chargeOptions);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ blockchainFee: 5000 }), done);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ amounts: [10000] }), done);
    });

    it('should not add service charge fee (0)', done => {
      let chargeOptions = {
        min_tx_amount: 1000000,
        max_service_charge: 100000,
        percent: 0.5,
        send_to_miner: true
      };
      payment.amount(10000, null, chargeOptions);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ blockchainFee: 0 }), done);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ amounts: [10000] }), done);
    });

    it('should add maximum fee', done => {
      let chargeOptions = {
        min_tx_amount: 0,
        max_service_charge: 100,
        percent: 0.5,
        send_to_miner: true
      };
      payment.amount(10000, null, chargeOptions);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ blockchainFee: 100 }), done);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ amounts: [10000] }), done);
    });

    it('should add no fee if percent is 0', done => {
      let chargeOptions = {
        min_tx_amount: 0,
        max_service_charge: 100000,
        percent: 0,
        send_to_miner: true
      };
      payment.amount(10000, null, chargeOptions);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ blockchainFee: 0 }), done);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ amounts: [10000] }), done);
    });

    it('should add no fee if max is 0', done => {
      let chargeOptions = {
        min_tx_amount: 0,
        max_service_charge: 0,
        percent: 0.5,
        send_to_miner: true
      };
      payment.amount(10000, null, chargeOptions);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ blockchainFee: 0 }), done);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ amounts: [10000] }), done);
    });
  });

  describe('build', () => {
    it('should add service charge fee to an extra output', () => {
      let chargeOptions = {
        min_tx_amount: 0,
        max_service_charge: 1000000,
        percent: 0.5,
        send_to_miner: true
      };
      payment.from('5JrXwqEhjpVF7oXnHPsuddTc6CceccLRTfNpqU2AZH8RkPMvZZu')
             .to(1)
             .amount(5000, null, chargeOptions)
             .build()
             .sideEffect(
               p => {
                 const [out, charge, change] = p.transaction.transaction.tx.outs.map(o => o.value);
                 expect(out).toBe(5000);
                 expect(charge).toBe(2500);
                 expect(change).toBe(5020);
               }
             );
    });

    it('should not add the extra output with the service fee charge', () => {
      let chargeOptions = {
        min_tx_amount: 0,
        max_service_charge: 1000000,
        percent: 0.5,
        send_to_miner: true
      };
      payment.from('5JrXwqEhjpVF7oXnHPsuddTc6CceccLRTfNpqU2AZH8RkPMvZZu')
             .to(1)
             .amount(5000, null, chargeOptions)
             .build(true)
             .sideEffect(
               p => {
                 const [out, change] = p.transaction.transaction.tx.outs.map(o => o.value);
                 expect(out).toBe(5000);
                 expect(change).toBe(5020);
               }
             );
    });
  });

  describe('fee', () => {
    it('should not set a non positive integer fee', done => {
      payment.from('5JrXwqEhjpVF7oXnHPsuddTc6CceccLRTfNpqU2AZH8RkPMvZZu');
      payment.updateFeePerKb(10);
      payment.amount(5000);
      payment.fee(-3000);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ finalFee: 2260 }), done);
    });

    it('should not set a string fee', done => {
      payment.from('5JrXwqEhjpVF7oXnHPsuddTc6CceccLRTfNpqU2AZH8RkPMvZZu');
      payment.updateFeePerKb(10);
      payment.amount(5000);
      payment.fee('3000');
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ finalFee: 2260 }), done);
    });

    it('should set a valid fee', done => {
      payment.from('5JrXwqEhjpVF7oXnHPsuddTc6CceccLRTfNpqU2AZH8RkPMvZZu');
      payment.amount(5000);
      payment.fee(1000);
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ finalFee: 1000 }), done);
    });
  });
});
