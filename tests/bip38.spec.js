
let Bitcoin = require('bitcoinjs-lib');
let BigInteger = require('bigi');
let ImportExport = require('../src/import-export');
let WalletCrypto = require('../src/wallet-crypto');

describe('BIP38', () => {
  let observer = {
    success (key) {},
    wrong_password () {},
    error (e) {}
  };

  beforeEach(() => {
    window.setTimeout = myFunction => myFunction();
    localStorage.clear();
    spyOn(WalletCrypto, 'scrypt').and.callFake((password, salt, N, r, p, dkLen) => {
      let wrongPassword = 'WRONG_PASSWORD' + 'e957a24a' + '16384' + '8' + '8' + '64';
      let testVector1 = 'TestingOneTwoThree' + 'e957a24a' + '16384' + '8' + '8' + '64';
      let testVector2 = 'Satoshi' + '572e117e' + '16384' + '8' + '8' + '64';
      let testVector3 = 'ϓ\u0000𐐀💩' + 'f4e775a8' + '16384' + '8' + '8' + '64';
      let testVector4 = 'TestingOneTwoThree' + '43be4179' + '16384' + '8' + '8' + '64';
      let testVector5 = 'Satoshi' + '26e017d2' + '16384' + '8' + '8' + '64';
      let testVector6 = 'TestingOneTwoThree' + 'a50dba6772cb9383' + '16384' + '8' + '8' + '32';
      let testVector61 = '020eac136e97ce6bf3e2bceb65d906742f7317b6518c54c64353c43dcc36688c47' + '62b5b722a50dba6772cb9383' + '1024' + '1' + '1' + '64';
      let testVector7 = 'Satoshi' + '67010a9573418906' + '16384' + '8' + '8' + '32';
      let testVector71 = '022413a674b5bceab5abe0b14ce44dfa7fc6b55ecdbed88e7c50c0b4e953f1e05e' + '059a548167010a9573418906' + '1024' + '1' + '1' + '64';
      let testVector8 = 'MOLON LABE' + '4fca5a97' + '16384' + '8' + '8' + '32';
      let testVector81 = '02a6bf1824208903aa344833d614f7fa3ba46f4f8d57b2e219a1cfac961a9b7395' + 'bb458cef4fca5a974040f001' + '1024' + '1' + '1' + '64';
      let testVector9 = 'ΜΟΛΩΝ ΛΑΒΕ' + 'c40ea76f' + '16384' + '8' + '8' + '32';
      let testVector91 = '030a7a6f6536951f1cdf450e9ef6c1f615b904af58f7c17598cec3274e6769d3ef' + '494af136c40ea76fc501a001' + '1024' + '1' + '1' + '64';
      let CryptoScryptCache = {};
      CryptoScryptCache[wrongPassword] = Buffer('e39fc025591c26f6ebd47077b869958fedcb88df623fd6743fab116fefac0a4e1d13216d5e4294d15fd79772b8a91da612a030935ec30aa4f97c0adee73539a6', 'hex');
      CryptoScryptCache[testVector1] = Buffer('f87648a6b42fdd86ef6837a249cde15318f264d43a859b610e78ea63d51cb2d3e60bf44bfb29d543bba24afcccfadbfc6ef9312fcccf589fa5ea1366ec21e4c0', 'hex');
      CryptoScryptCache[testVector2] = Buffer('02d4a6b94240bd1cdaa6773f430e43a0d9a8cbc9a83b044998f7ef2e3f31a4de7f2436fede417c46b988879f4ef0595b75a55bcaec27848ef94e9f4b4d684cb9', 'hex');
      CryptoScryptCache[testVector3] = Buffer('981726c732b25e1eede74a32ba72fd113144c52d2eadc0f4bb12ec9ccb2e05cfc2579a6c3280d21cee2e2e6b4bf23d3b8cf2a39574b942e6f9f4381659db4c6f', 'hex');
      CryptoScryptCache[testVector4] = Buffer('731ef3c737b55df4998b44fa8a547a3f38df424da240de389b11d1875ba477672f2fe81b0532b5950e3ea6fff92c65d467aa7d054969821de2344f7a86d42569', 'hex');
      CryptoScryptCache[testVector5] = Buffer('0478e3e18d96ae2fbe033e3261944670c0ead16336890e4af46f55851ae211d22c97d288383bfd14983e5c574dafeb66f31b16bad037d40a6467019840ffa323', 'hex');
      CryptoScryptCache[testVector6] = Buffer('c8ff7a1c8c8898a0361e477fa8f0f05c00d07c5d9626f00b03c0140a307c98f4', 'hex');
      CryptoScryptCache[testVector61] = Buffer('da2d320e2ca088575369601e94dd71f210fc69c047a3d0f48bdbaab595916dc7b8d083ea2678b5a71558c0fb0efa58b565227d05adf0c25fa0b9a74755477827', 'hex');
      CryptoScryptCache[testVector7] = Buffer('e8a9722cf7988c31f929bd656085ca6470595e068bae22858ea7d84fb4197a99', 'hex');
      CryptoScryptCache[testVector71] = Buffer('dc7d942ea3c6c8953b30ee010c147a3222f6f5c52923e28185832f64d86781bc5120c42e25509460892ac9fec45e1bc52613238e1b5c1ead9d41bdeea8892c5c', 'hex');
      CryptoScryptCache[testVector8] = Buffer('7f5aee1a080d9e84f4ddf31f8b78356f472c03ac95bff320789d50137e66f279', 'hex');
      CryptoScryptCache[testVector81] = Buffer('a8bc4ad35fb69cc37f129abb458245e4523c97133b22a5cad88035f99d0b1d50ffc8317a1eaea330e1e17305539ec5c5ce36168a35d6d13fefa21d5e2cb1c1e9', 'hex');
      CryptoScryptCache[testVector9] = Buffer('147562b11c3a361365d89c1a2e5bed186c43c3c2d964632d17b2a56f96fc3110', 'hex');
      CryptoScryptCache[testVector91] = Buffer('1471d24b21c21e164f48237e9a5f0926493bf6118373a0d2e18387a7c345646d6889d2c30be9721874f10844fb98794de1caba62bb659a51492d4f33ca3237d7', 'hex');
      let keyTest = password.toString('hex') + salt.toString('hex') + N.toString() + r.toString() + p.toString() + dkLen.toString();
      let Image = CryptoScryptCache[keyTest];
      if (Image != null) {
        return Image;
      } else {
        throw new Error('Input not cached in crypto_scrypt mock function');
      }
    });
  });

  describe('parseBIP38toECPair()', () => {
    beforeEach(() => {
      Bitcoin.ECPair.originalFromWIF = Bitcoin.ECPair.fromWIF;
      Bitcoin.OriginalECPair = Bitcoin.ECPair;

      spyOn(Bitcoin.ECPair, 'fromWIF').and.callFake(wif => {
        let key;
        let hex = hex = localStorage.getItem(`Bitcoin.ECPair.fromWIF ${wif}`);
        if (hex) {
          let buffer = new Buffer(hex, 'hex');
          key = { d: BigInteger.fromBuffer(buffer) };
        } else {
          key = Bitcoin.ECPair.originalFromWIF(wif);
          hex = key.d.toBuffer().toString('hex');
          localStorage.setItem(`Bitcoin.ECPair.fromWIF ${wif}`, hex);
        }
        return key;
      });

      spyOn(Bitcoin, 'ECPair').and.callFake((d, Q, options = {}) => {
        let key;
        let cacheKey = `Bitcoin.ECPair ${d.toBuffer().toString('hex')} ${options.compressed}`;
        let hex = localStorage.getItem(cacheKey);
        if (hex) {
          console.log('Cache hit: ', hex);
          key = Bitcoin.OriginalECPair.fromPublicKeyBuffer(Buffer(hex));
          key.d = d;
        } else {
          key = new Bitcoin.OriginalECPair(d, null, {
            compressed: options.compressed
          });
          hex = key.getPublicKeyBuffer().toString('hex');
          localStorage.setItem(cacheKey, hex);
        }
        let address = key.getAddress();
        let wif = key.toWIF();
        let pubKeyBuffer = key.getPublicKeyBuffer();
        return {
          d,
          getPublicKeyBuffer: function () {
            return pubKeyBuffer;
          },
          toWIF: function () {
            return wif;
          },
          getAddress: function () {
            return address;
          }
        };
      });
    });

    it('when called with correct password should fire success with the right params', () => {
      let pw = 'TestingOneTwoThree';
      let pk = '6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg';
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let k = Bitcoin.ECPair.fromWIF('5KN7MzqK5wt2TP1fQCYyHBtDrXdJuXbUzm4A9rKAteGu3Qi5CVR');
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      expect(WalletCrypto.scrypt).toHaveBeenCalled();
      expect(observer.success).toHaveBeenCalled();
      expect(observer.success.calls.argsFor(0)[0].d).toEqual(k.d);
      expect(observer.wrong_password).not.toHaveBeenCalled();
    });

    it('when called with wrong password should fire wrong_password', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let pw = 'WRONG_PASSWORD';
      let pk = '6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      expect(observer.wrong_password).toHaveBeenCalled();
    });

    it('(testvector1) No compression, no EC multiply, Test 1 , should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let expectedWIF = '5KN7MzqK5wt2TP1fQCYyHBtDrXdJuXbUzm4A9rKAteGu3Qi5CVR';
      let expectedCompression = false;
      let pw = 'TestingOneTwoThree';
      let pk = '6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      let computedWIF = observer.success.calls.argsFor(0)[0].toWIF();
      let computedCompression = observer.success.calls.argsFor(0)[1];
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(computedWIF).toEqual(expectedWIF);
      expect(computedCompression).toEqual(expectedCompression);
    });

    it('(testvector2) No compression, no EC multiply, Test 2, should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let expectedWIF = '5HtasZ6ofTHP6HCwTqTkLDuLQisYPah7aUnSKfC7h4hMUVw2gi5';
      let expectedCompression = false;
      let pw = 'Satoshi';
      let pk = '6PRNFFkZc2NZ6dJqFfhRoFNMR9Lnyj7dYGrzdgXXVMXcxoKTePPX1dWByq';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      let computedWIF = observer.success.calls.argsFor(0)[0].toWIF();
      let computedCompression = observer.success.calls.argsFor(0)[1];
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(computedWIF).toEqual(expectedWIF);
      expect(computedCompression).toEqual(expectedCompression);
    });

    xit('(testvector3) No compression, no EC multiply, Test 3, should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let pw = String.fromCodePoint(0x03d2, 0x0301, 0x0000, 0x00010400, 0x0001f4a9);
      let pk = '6PRW5o9FLp4gJDDVqJQKJFTpMvdsSGJxMYHtHaQBF3ooa8mwD69bapcDQn';
      let k = Bitcoin.ECPair.fromWIF('5Jajm8eQ22H3pGWLEVCXyvND8dQZhiQhoLJNKjYXk9roUFTMSZ4');
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(observer.success.calls.argsFor(0)[0].d).toEqual(k.d);
    });

    it('(testvector4) Compression, no EC multiply, Test 1, should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let expectedWIF = 'L44B5gGEpqEDRS9vVPz7QT35jcBG2r3CZwSwQ4fCewXAhAhqGVpP';
      let expectedCompression = true;
      let pw = 'TestingOneTwoThree';
      let pk = '6PYNKZ1EAgYgmQfmNVamxyXVWHzK5s6DGhwP4J5o44cvXdoY7sRzhtpUeo';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      let computedWIF = observer.success.calls.argsFor(0)[0].toWIF();
      let computedCompression = observer.success.calls.argsFor(0)[1];
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(computedWIF).toEqual(expectedWIF);
      expect(computedCompression).toEqual(expectedCompression);
    });

    it('(testvector5) Compression, no EC multiply, Test 2, should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let expectedWIF = 'KwYgW8gcxj1JWJXhPSu4Fqwzfhp5Yfi42mdYmMa4XqK7NJxXUSK7';
      let expectedCompression = true;
      let pw = 'Satoshi';
      let pk = '6PYLtMnXvfG3oJde97zRyLYFZCYizPU5T3LwgdYJz1fRhh16bU7u6PPmY7';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      let computedWIF = observer.success.calls.argsFor(0)[0].toWIF();
      let computedCompression = observer.success.calls.argsFor(0)[1];
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(computedWIF).toEqual(expectedWIF);
      expect(computedCompression).toEqual(expectedCompression);
    });

    it('(testvector6) No compression, EC multiply, no lot/sequence numbers, Test 1, should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let expectedWIF = '5K4caxezwjGCGfnoPTZ8tMcJBLB7Jvyjv4xxeacadhq8nLisLR2';
      let expectedCompression = false;
      let pw = 'TestingOneTwoThree';
      let pk = '6PfQu77ygVyJLZjfvMLyhLMQbYnu5uguoJJ4kMCLqWwPEdfpwANVS76gTX';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      let computedWIF = observer.success.calls.argsFor(0)[0].toWIF();
      let computedCompression = observer.success.calls.argsFor(0)[1];
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(computedWIF).toEqual(expectedWIF);
      expect(computedCompression).toEqual(expectedCompression);
    });

    it('(testvector7) No compression, EC multiply, no lot/sequence numbers, Test 2, should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let expectedWIF = '5KJ51SgxWaAYR13zd9ReMhJpwrcX47xTJh2D3fGPG9CM8vkv5sH';
      let expectedCompression = false;
      let pw = 'Satoshi';
      let pk = '6PfLGnQs6VZnrNpmVKfjotbnQuaJK4KZoPFrAjx1JMJUa1Ft8gnf5WxfKd';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      let computedWIF = observer.success.calls.argsFor(0)[0].toWIF();
      let computedCompression = observer.success.calls.argsFor(0)[1];
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(computedWIF).toEqual(expectedWIF);
      expect(computedCompression).toEqual(expectedCompression);
    });

    it('(testvector8) No compression, EC multiply, lot/sequence numbers, Test 1, should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let expectedWIF = '5JLdxTtcTHcfYcmJsNVy1v2PMDx432JPoYcBTVVRHpPaxUrdtf8';
      let expectedCompression = false;
      let pw = 'MOLON LABE';
      let pk = '6PgNBNNzDkKdhkT6uJntUXwwzQV8Rr2tZcbkDcuC9DZRsS6AtHts4Ypo1j';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      let computedWIF = observer.success.calls.argsFor(0)[0].toWIF();
      let computedCompression = observer.success.calls.argsFor(0)[1];
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(computedWIF).toEqual(expectedWIF);
      expect(computedCompression).toEqual(expectedCompression);
    });

    it('(testvector9) No compression, EC multiply, lot/sequence numbers, Test 2, should work', () => {
      spyOn(observer, 'success');
      spyOn(observer, 'wrong_password');
      let expectedWIF = '5KMKKuUmAkiNbA3DazMQiLfDq47qs8MAEThm4yL8R2PhV1ov33D';
      let expectedCompression = false;
      let pw = 'ΜΟΛΩΝ ΛΑΒΕ';
      let pk = '6PgGWtx25kUg8QWvwuJAgorN6k9FbE25rv5dMRwu5SKMnfpfVe5mar2ngH';
      ImportExport.parseBIP38toECPair(pk, pw, observer.success, observer.wrong_password);
      let computedWIF = observer.success.calls.argsFor(0)[0].toWIF();
      let computedCompression = observer.success.calls.argsFor(0)[1];
      expect(observer.wrong_password).not.toHaveBeenCalled();
      expect(computedWIF).toEqual(expectedWIF);
      expect(computedCompression).toEqual(expectedCompression);
    });
  });
});
