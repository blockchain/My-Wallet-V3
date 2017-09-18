let proxyquire = require('proxyquireify')(require);

let Bitcoin = require('bitcoinjs-lib');
let { EventEmitter } = require('events');
let Helpers = require('../src/helpers');

let MyWallet;
let stubs =
  {'./wallet': MyWallet};

describe('Transaction', () => {
  let Transaction = proxyquire('../src/transaction', stubs);

  let observer;
  let data;
  let payment;
  let ee = new EventEmitter();

  beforeEach(() => {
    data = {
      from: '1DiJVG3oD3yeqW26qcVaghwTjvMaVoeghX',
      privateKey: 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj',
      to: '1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h',
      amount: 50000,
      toMultiple: ['1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h', '1FfmbHfnpaZjKFvyi1okTjJJusN455paPH'],
      multipleAmounts: [20000, 10000],
      fee: 10000,
      feePerKb: 10000,
      note: 'That is an expensive toy',
      unspentMock: [
        {
          'tx_hash': '594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861',
          'hash': '6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59',
          'tx_hash_big_endian': '6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59',
          'tx_index': 82222265,
          'index': 0,
          'tx_output_n': 0,
          'script': '76a91449f842901a0c81fb9c0c0f8c61027d2b085a2a9088ac',
          'value': 61746,
          'value_hex': '00f132',
          'confirmations': 0
        }
      ],
      unspentMockXPub: [
        {
          'tx_hash': '6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59',
          'hash': '594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861',
          'tx_hash_big_endian': '594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861',
          'tx_index': 82222264,
          'index': 0,
          'tx_output_n': 0,
          'script': '76a91449f842901a0c81fb9c0c0f8c61027d2b083a2a9088ac',
          'value': 234235,
          'value_hex': '00f132',
          'confirmations': 1,
          'xpub': { 'path': 'm/0/0' }
        }
      ]
    };

    payment = {
      selectedCoins: data.unspentMock,
      to: data.to,
      amounts: data.amount,
      finalFee: data.fee,
      change: data.from
    };

    observer = {
      success () { },
      error () { }
    };

    spyOn(observer, 'success');
    spyOn(observer, 'error');

    let BlockchainAPI = {
      get_unspent () {},
      push_tx () {}
    };

    spyOn(BlockchainAPI, 'push_tx')
      .and.callFake((tx, note, success, error) => success());

    spyOn(BlockchainAPI, 'get_unspent')
      .and.callFake((xpubList, success, error, conf, nocache) => success(data.unspentMock));
  });

    // spyOn(WalletStore, "getPrivateKey").and.callFake((address) -> 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj')

  describe('create new Transaction', () => {
    it('should fail without unspent outputs', () => {
      payment.selectedCoins = null;
      try {
        return new Transaction(payment);
      } catch (e) {
        expect(e.name).toBe('AssertionError');
        expect(e.message.error).toBe('NO_UNSPENT_OUTPUTS');
      }
    });

    it('should fail without amount lower than dust threshold', () => {
      payment.amounts = 100;
      try {
        return new Transaction(payment);
      } catch (e) {
        expect(e.name).toBe('AssertionError');
        expect(e.message.error).toBe('BELOW_DUST_THRESHOLD');
      }
    });

    it('should give dust change to miners', () => {
      payment.amounts = [61700];

      let tx = new Transaction(payment);

      expect(tx.transaction.tx.outs.length).toEqual(1);
    });

    it('should create multiple outputs', () => {
      payment.to = data.toMultiple;
      payment.amounts = data.multipleAmounts;
      let tx = new Transaction(payment, ee);

      let privateKeyBase58 = data.privateKey;
      let format = Helpers.detectPrivateKeyFormat(privateKeyBase58);
      let key = Helpers.privateKeyStringToKey(privateKeyBase58, format);

      // Jasmine seems to break the strict equality test here:
      // https://github.com/bitcoinjs/bitcoinjs-lib/blob/v2.1.4/src/transaction_builder.js#L332

      // Check the network property is set:
      expect(key.network).toEqual(Bitcoin.networks.bitcoin);
      expect(tx.transaction.network).toEqual(Bitcoin.networks.bitcoin);

      // Override it so the assert statement passes:
      key.network = Bitcoin.networks.bitcoin;
      tx.transaction.network = Bitcoin.networks.bitcoin;
      // End of Jasmine workaround

      key.compressed = false;

      let privateKeys = [key];

      tx.addPrivateKeys(privateKeys);

      tx = tx.sign().build();

      let expectedHex = '0100000001594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861000000008a4730440220354fd8f420d1f3ffc802af13d451f853d26f343b10225e92a17d3e831edb81960220074d8dac3c497a0481e2041df4f3cd7a82e32415c11b2054b246187f3ff733a8014104a7392f5628776b530aa5fbb41ac10c327ccd2cf64622a81671038ecda25084af786fd54d43689241694d1d65e6bde98756fa01dfd2f5a90d5318ab3fb7bad8c1ffffffff03204e0000000000001976a914078d35591e340799ee96968936e8b2ea8ce504a688ac10270000000000001976a914a0e6ca5444e4d8b7c80f70237f332320387f18c788acf2540000000000001976a9148b71295471e921703a938aa9e01433deb07c1aa588ac00000000';
      expect(tx.toHex()).toEqual(expectedHex);
    });
  });

  describe('provide Transaction with private keys', () => {
    it('should want addresses when supplied with unspent outputs', () => {
      let transaction = new Transaction(payment, ee);

      expect(transaction.addressesOfNeededPrivateKeys.length).toBe(1);
      expect(transaction.pathsOfNeededPrivateKeys.length).toBe(0);
    });

    it('should accept the right private key', () => {
      let transaction = new Transaction(payment, ee);

      let privateKeyBase58 = data.privateKey;
      let format = Helpers.detectPrivateKeyFormat(privateKeyBase58);
      let key = Helpers.privateKeyStringToKey(privateKeyBase58, format);
      key.compressed = false;
      let privateKeys = [key];

      transaction.addPrivateKeys(privateKeys);
      expect(transaction.privateKeys).toEqual(privateKeys);
    });

    it('should not accept the wrong private key', () => {
      let transaction = new Transaction(payment, ee);

      let privateKeyWIF = '5JfdACpmDbLk7jmjU6kuCdLNFgedL19RnbjZYENAEG8Ntto9zRc';
      let format = Helpers.detectPrivateKeyFormat(privateKeyWIF);
      let key = Helpers.privateKeyStringToKey(privateKeyWIF, format);
      let privateKeys = [key];

      expect(() => transaction.addPrivateKeys(privateKeys)).toThrow;
    });

    it('should sign and produce the correct signed script', () => {
      let transaction = new Transaction(payment, ee);
      let privateKeyBase58 = data.privateKey;
      let format = Helpers.detectPrivateKeyFormat(privateKeyBase58);
      let key = Helpers.privateKeyStringToKey(privateKeyBase58, format);
      key.compressed = false;
      let privateKeys = [key];

      transaction.addPrivateKeys(privateKeys);

      // Jasmine seems to break the strict equality test here:
      // https://github.com/bitcoinjs/bitcoinjs-lib/blob/v2.1.4/src/transaction_builder.js#L332

      // Check the network property is set:
      expect(key.network).toEqual(Bitcoin.networks.bitcoin);
      expect(transaction.transaction.network).toEqual(Bitcoin.networks.bitcoin);

      // Override it so the assert statement passes:
      key.network = Bitcoin.networks.bitcoin;
      transaction.transaction.network = Bitcoin.networks.bitcoin;
      // End of Jasmine workaround

      let tx = transaction.sign().build();

      let expectedHex = '0100000001594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861000000008a4730440220187d6b567d29fe10bea29aa36158edb3fcd9bed5e835b93b9f30d630aea1c7740220612be05b0d87b0a170f7ead7f9688d7172c704f63deb74705779cf8ac26ec3b9014104a7392f5628776b530aa5fbb41ac10c327ccd2cf64622a81671038ecda25084af786fd54d43689241694d1d65e6bde98756fa01dfd2f5a90d5318ab3fb7bad8c1ffffffff0250c30000000000001976a914078d35591e340799ee96968936e8b2ea8ce504a688acd2060000000000001976a9148b71295471e921703a938aa9e01433deb07c1aa588ac00000000';
      expect(tx.toHex()).toEqual(expectedHex);
    });

    describe('BIP69 transaction inputs and outputs', () => {
      let getIn;
      let getOut;

      let testVectors = require('./__data__/bip69-test-vectors');

      beforeEach(() => {
        getIn = ({hash}) => [].reverse.call(hash).toString('hex');
        getOut = ({script}) => script.toString('hex');
      });

      it('should sort testvector 1', () => {
        let i;
        let sortedInputs = [
          '0e53ec5dfb2cb8a71fec32dc9a634a35b7e24799295ddd5278217822e0b31f57',
          '26aa6e6d8b9e49bb0630aac301db6757c02e3619feb4ee0eea81eb1672947024',
          '28e0fdd185542f2c6ea19030b0796051e7772b6026dd5ddccd7a2f93b73e6fc2',
          '381de9b9ae1a94d9c17f6a08ef9d341a5ce29e2e60c36a52d333ff6203e58d5d',
          '3b8b2f8efceb60ba78ca8bba206a137f14cb5ea4035e761ee204302d46b98de2',
          '402b2c02411720bf409eff60d05adad684f135838962823f3614cc657dd7bc0a',
          '54ffff182965ed0957dba1239c27164ace5a73c9b62a660c74b7b7f15ff61e7a',
          '643e5f4e66373a57251fb173151e838ccd27d279aca882997e005016bb53d5aa',
          '6c1d56f31b2de4bfc6aaea28396b333102b1f600da9c6d6149e96ca43f1102b1',
          '7a1de137cbafb5c70405455c49c5104ca3057a1f1243e6563bb9245c9c88c191',
          '7d037ceb2ee0dc03e82f17be7935d238b35d1deabf953a892a4507bfbeeb3ba4',
          'a5e899dddb28776ea9ddac0a502316d53a4a3fca607c72f66c470e0412e34086',
          'b4112b8f900a7ca0c8b0e7c4dfad35c6be5f6be46b3458974988e1cdb2fa61b8',
          'bafd65e3c7f3f9fdfdc1ddb026131b278c3be1af90a4a6ffa78c4658f9ec0c85',
          'de0411a1e97484a2804ff1dbde260ac19de841bebad1880c782941aca883b4e9',
          'f0a130a84912d03c1d284974f563c5949ac13f8342b8112edff52971599e6a45',
          'f320832a9d2e2452af63154bc687493484a0e7745ebd3aaf9ca19eb80834ad60'];
        let sortedOutputs = [
          '76a9144a5fba237213a062f6f57978f796390bdcf8d01588ac',
          '76a9145be32612930b8323add2212a4ec03c1562084f8488ac'];

        let txHex = testVectors[0];
        let tx = new Transaction(payment, ee);
        tx.transaction.tx = Bitcoin.Transaction.fromHex(txHex);
        tx.privateKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        tx.addressesOfInputs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        tx.sortBIP69();

        let allSortedIns = ((() => {
          let result = [];
          for (i = 0; i <= 16; i++) {
            result.push(getIn(tx.transaction.tx.ins[i]) === sortedInputs[i]);
          }
          return result;
        })()).every(x => x);
        let allSortedOuts = ((() => {
          let result1 = [];
          for (i = 0; i <= 1; i++) {
            result1.push(getOut(tx.transaction.tx.outs[i]) === sortedOutputs[i]);
          }
          return result1;
        })()).every(x => x);

        expect(allSortedIns).toBeTruthy();
        expect(allSortedOuts).toBeTruthy();
      });

      it('should sort testvector 2', () => {
        let i;
        let sortedInputs = [
          '35288d269cee1941eaebb2ea85e32b42cdb2b04284a56d8b14dcc3f5c65d6055',
          '35288d269cee1941eaebb2ea85e32b42cdb2b04284a56d8b14dcc3f5c65d6055'];
        let sortedOutputs = [
          '41046a0765b5865641ce08dd39690aade26dfbf5511430ca428a3089261361cef170e3929a68aee3d8d4848b0c5111b0a37b82b86ad559fd2a745b44d8e8d9dfdc0cac',
          '41044a656f065871a353f216ca26cef8dde2f03e8c16202d2e8ad769f02032cb86a5eb5e56842e92e19141d60a01928f8dd2c875a390f67c1f6c94cfc617c0ea45afac'];

        let txHex = testVectors[1];
        let tx = new Transaction(payment, ee);
        tx.transaction.tx = Bitcoin.Transaction.fromHex(txHex);
        tx.privateKeys = [1, 2];
        tx.addressesOfInputs = [1, 2];
        tx.transaction.tx.ins.reverse();  // change default because it is already correct
        tx.transaction.tx.outs.reverse(); // change default because it is already correct
        tx.sortBIP69();
        let allSortedIns = ((() => {
          let result = [];
          for (i = 0; i <= 1; i++) {
            result.push(getIn(tx.transaction.tx.ins[i]) === sortedInputs[i]);
          }
          return result;
        })()).every(x => x);
        let allSortedOuts = ((() => {
          let result1 = [];
          for (i = 0; i <= 1; i++) {
            result1.push(getOut(tx.transaction.tx.outs[i]) === sortedOutputs[i]);
          }
          return result1;
        })()).every(x => x);
        expect(allSortedIns).toBeTruthy();
        expect(allSortedOuts).toBeTruthy();
      });
    });

    describe('Outputs with xpub information', () =>

      it('should add the path to the private key to pathsOfNeededPrivateKeys', () => {
        payment.selectedCoins = data.unspentMockXPub;
        let tx = new Transaction(payment);

        expect(tx.pathsOfNeededPrivateKeys.length).toEqual(1);
      })
    );
  });

  describe('Transaction helpers', () => {
    it('Transaction.inputCost should be 0.148 per kb', () => {
      let ic = Transaction.inputCost(10000);
      expect(ic).toBe(1480);
    });

    it('Transaction.guessSize should be zero', () => {
      let s = Transaction.guessSize(0, 10);
      expect(s).toBe(0);
    });

    it('Transaction.guessSize should be zero', () => {
      let s = Transaction.guessSize(10, 0);
      expect(s).toBe(0);
    });

    it('Transaction.guessSize should be right', () => {
      let s = Transaction.guessSize(10, 10);
      expect(s).toBe(1830);
    });

    it('Transaction.guessFee should be right', () => {
      let s = Transaction.guessFee(11, 7, 25000);
      expect(s).toBe(46900);
    });

    it('Transaction.filterUsableCoins should return an empty array if given a bad argument', () => {
      let s = Transaction.filterUsableCoins(1, 1000000);
      expect(s).toEqual([]);
    });

    it('Transaction.filterUsableCoins should filter all coins', () => {
      let s = Transaction.filterUsableCoins(data.unspentMock, 1000000);
      expect(s).toEqual([]);
    });

    it('Transaction.filterUsableCoins should not filter any coins', () => {
      let s = Transaction.filterUsableCoins(data.unspentMock, 1000);
      expect(s).toEqual(data.unspentMock);
    });

    it('Transaction.filterUsableCoins should work for empty list', () => {
      let s = Transaction.filterUsableCoins([], 1000);
      expect(s).toEqual([]);
    });

    it('Transaction.maxAvailableAmount should be computed right', () => {
      let coins = [{value: 40000}, {value: 30000}, {value: 20000}, {value: 10000}];
      let m = Transaction.maxAvailableAmount(coins, 1000);
      expect(m).toEqual({ amount: 99330, fee: 670 });
    });

    it('Transaction.maxAvailableAmount should be computed right for empty lists', () => {
      let coins = [];
      let m = Transaction.maxAvailableAmount(coins, 1000);
      expect(m).toEqual({ amount: 0, fee: 0 });
    });

    it('Transaction.sumOfCoins should be computed right', () => {
      let coins = [{value: 40000}, {value: 30000}, {value: 20000}, {value: 10000}];
      let m = Transaction.sumOfCoins(coins);
      expect(m).toBe(100000);
    });

    it('Transaction.sumOfCoins should be computed right for empty lists', () => {
      let coins = [];
      let m = Transaction.sumOfCoins(coins);
      expect(m).toBe(0);
    });

    it('Transaction.selectCoins empty list with fee-per-kb', () => {
      let coins = [];
      let amounts = [10000];
      let fee = 10000;
      let isAbsFee = false;
      let s = Transaction.selectCoins(coins, amounts, fee, isAbsFee);
      expect(s).toEqual({'coins': [], 'fee': 0});
    });

    it('Transaction.selectCoins empty list with fee-per-kb', () => {
      let coins = [];
      let amounts = [10000];
      let fee = 10000;
      let isAbsFee = true;
      let s = Transaction.selectCoins(coins, amounts, fee, isAbsFee);
      expect(s).toEqual({'coins': [], 'fee': 0});
    });

    it('Transaction.selectCoins with fee-Per-kb', () => {
      let coins = [{value: 40000}, {value: 30000}, {value: 20000}, {value: 10000}];
      let amounts = [10000, 30000];
      let fee = 10000;
      let isAbsFee = false;
      let s = Transaction.selectCoins(coins, amounts, fee, isAbsFee);
      expect(s).toEqual({'coins': [{value: 40000}, {value: 30000}], 'fee': 3740});
    });

    it('Transaction.selectCoins with absolute fee', () => {
      let coins = [{value: 40000}, {value: 30000}, {value: 20000}, {value: 10000}];
      let amounts = [10000, 30000];
      let fee = 10000;
      let isAbsFee = true;
      let s = Transaction.selectCoins(coins, amounts, fee, isAbsFee);
      expect(s).toEqual({'coins': [{value: 40000}, {value: 30000}], 'fee': 10000});
    });
  });
});
