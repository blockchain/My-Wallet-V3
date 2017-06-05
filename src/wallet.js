var MyWallet = module.exports = {};

var assert = require('assert');
var Buffer = require('buffer').Buffer;
var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var WalletSignup = require('./wallet-signup');
var WalletNetwork = require('./wallet-network');
var API = require('./api');
var Wallet = require('./blockchain-wallet');
var Helpers = require('./helpers');
var BlockchainSocket = require('./blockchain-socket');
var RNG = require('./rng');
var BIP39 = require('bip39');
var Bitcoin = require('bitcoinjs-lib');
var pbkdf2 = require('pbkdf2');
var constants = require('./constants');

var isInitialized = false;
MyWallet.wallet = undefined;
MyWallet.ws = new BlockchainSocket();

// used locally and overridden in iOS
MyWallet.socketConnect = function () {
  MyWallet.ws.connect(onOpen, onMessage, onClose);

  var lastOnChange = { checksum: null };

  function onMessage (message) {
    MyWallet.getSocketOnMessage(message, lastOnChange);
  }

  function onOpen () {
    WalletStore.sendEvent('ws_on_open');
    MyWallet.ws.send(MyWallet.getSocketOnOpenMessage());
  }

  function onClose () {
    WalletStore.sendEvent('ws_on_close');
  }
};

// used two times
function didDecryptWallet (success) {
  // We need to check if the wallet has changed
  MyWallet.getWallet();
  success();
}

// called by native websocket in iOS
MyWallet.getSocketOnMessage = function (message, lastOnChange) {
  var obj = null;

  if (!(typeof window === 'undefined') && message.data) {
    message = message.data;
  }
  try {
    obj = JSON.parse(message);
  } catch (e) {
    console.log('Websocket error: could not parse message data as JSON: ' + message);
    return;
  }

  if (obj.op === 'on_change') {
    var oldChecksum = WalletStore.generatePayloadChecksum();
    var newChecksum = obj.x.checksum;

    if (lastOnChange.checksum !== newChecksum && oldChecksum !== newChecksum) {
      lastOnChange.checksum = newChecksum;

      MyWallet.getWallet(function () {
        WalletStore.sendEvent('on_change');
      });
    }
  } else if (obj.op === 'utx') {
    WalletStore.sendEvent('on_tx_received', obj.x);
    var sendOnTx = WalletStore.sendEvent.bind(null, 'on_tx');
    MyWallet.wallet.getHistory().then(sendOnTx);
  } else if (obj.op === 'block') {
    if (MyWallet.wallet.latestBlock && obj.x.prevBlockIndex !== MyWallet.wallet.latestBlock.blockIndex && MyWallet.wallet.latestBlock.blockIndex !== 0) {
      // there is a reorg
      MyWallet.wallet.getHistory();
    } else {
      // there is no reorg
      MyWallet.wallet.latestBlock = obj.x;
      var up = function (t) {
        t.updateConfirmationsOnBlock(obj.x.txIndexes);
      };
      MyWallet.wallet.txList._transactions.forEach(up);
    }
    WalletStore.sendEvent('on_block');
  } else if (obj.op === 'pong') {
    clearTimeout(MyWallet.ws.pingTimeoutPID);
  } else if (obj.op === 'email_verified') {
    MyWallet.wallet.accountInfo.isEmailVerified = Boolean(obj.x);
    WalletStore.sendEvent('on_email_verified', obj.x);
  } else if (obj.op === 'wallet_logout') {
    WalletStore.sendEvent('wallet_logout', obj.x);
  }
};

// called by native websocket in iOS
MyWallet.getSocketOnOpenMessage = function () {
  var accounts = MyWallet.wallet.hdwallet ? MyWallet.wallet.hdwallet.activeXpubs : [];
  return MyWallet.ws.msgOnOpen(MyWallet.wallet.guid, MyWallet.wallet.activeAddresses, accounts);
};

// Fetch a new wallet from the server
// success(modified true/false)
// used locally and iOS
MyWallet.getWallet = function (success, error) {
  var data = {method: 'wallet.aes.json', format: 'json'};

  if (WalletStore.getPayloadChecksum() && WalletStore.getPayloadChecksum().length > 0) {
    data.checksum = WalletStore.getPayloadChecksum();
  }

  API.securePostCallbacks('wallet', data, function (obj) {
    if (!obj.payload || obj.payload === 'Not modified') {
      if (success) success();
      return;
    }

    WalletStore.setEncryptedWalletData(obj.payload);

    MyWallet.decryptAndInitializeWallet(function () {
      MyWallet.wallet.getHistory();

      MyWallet.wallet.loadMetadata().then(function () {
        if (success) success();
      });
    }, function () {
      // When re-fetching the wallet after a remote update, if we can't decrypt
      // it, logout for safety.
      MyWallet.logout(true);
      if (error) { error(); }
    });
  }, function (e) {
    if (error) error();
  });
};

MyWallet.decryptAndInitializeWallet = function (success, error, decryptSuccess, buildHdSuccess) {
  assert(success, 'Success callback required');
  assert(error, 'Error callback required');
  var encryptedWalletData = WalletStore.getEncryptedWalletData();

  if (encryptedWalletData === undefined || encryptedWalletData === null || encryptedWalletData.length === 0) {
    error('No Wallet Data To Decrypt');
    return;
  }
  WalletCrypto.decryptWallet(
    encryptedWalletData,
    WalletStore.getPassword(),
    function (obj, rootContainer) {
      MyWallet.wallet = new Wallet(obj);

      // this sanity check should be done on the load
      // if (!sharedKey || sharedKey.length == 0 || sharedKey.length != 36) {
      //   throw new Error('Shared Key is invalid');
      // }

      // TODO: pbkdf2 iterations should be stored correctly on wallet wrapper
      if (rootContainer) {
        WalletStore.setPbkdf2Iterations(rootContainer.pbkdf2_iterations);
      }
      // If we don't have a checksum then the wallet is probably brand new - so we can generate our own
      var checkSum = WalletStore.getPayloadChecksum();
      if (checkSum === undefined || checkSum === null || checkSum.length === 0) {
        WalletStore.setPayloadChecksum(WalletStore.generatePayloadChecksum());
      }
      if (MyWallet.wallet.isUpgradedToHD === false) {
        WalletStore.sendEvent('hd_wallets_does_not_exist');
      }
      setIsInitialized();
      decryptSuccess && decryptSuccess();
      success();
    },
    error
  );
};

const PAIRING_CODE_PBKDF2_ITERATIONS = 10;

// Used in the frontend / ios
MyWallet.makePairingCode = function (success, error) {
  try {
    API.securePostCallbacks('wallet', { method: 'pairing-encryption-password' }, function (encryptionPhrase) {
      var pwHex = new Buffer(WalletStore.getPassword()).toString('hex');
      var encrypted = WalletCrypto.encrypt(MyWallet.wallet.sharedKey + '|' + pwHex, encryptionPhrase, PAIRING_CODE_PBKDF2_ITERATIONS);
      success('1|' + MyWallet.wallet.guid + '|' + encrypted);
    }, function (e) {
      error(e);
    });
  } catch (e) {
    error(e);
  }
};

MyWallet.parsePairingCode = function (pairingCode) {
  if (pairingCode == null || pairingCode.length === 0) {
    return Promise.reject('Invalid Pairing QR Code');
  }

  let [version, guid, encrypted] = pairingCode.split('|');

  if (version !== '1') {
    return Promise.reject('Invalid Pairing Version Code ' + version);
  }

  if (guid == null || guid.length !== 36) {
    return Promise.reject('Invalid Pairing QR Code, GUID is invalid');
  }

  let data = {
    guid,
    format: 'plain',
    method: 'pairing-encryption-password'
  };

  let requestSuccess = (encryptionPhrase) => {
    let decrypted = WalletCrypto.decrypt(encrypted, encryptionPhrase, PAIRING_CODE_PBKDF2_ITERATIONS);
    if (decrypted != null && decrypted.length) {
      let [sharedKey, passwordHex] = decrypted.split('|');
      let password = new Buffer(passwordHex, 'hex').toString('utf8');
      return { version, guid, sharedKey, password };
    } else {
      return Promise.reject('Decryption Error');
    }
  };

  let requestError = (res) => {
    return Promise.reject('Pairing Code Server Error');
  };

  return API.request('POST', 'wallet', data).then(requestSuccess, requestError);
};

MyWallet.loginFromJSON = function (stringWallet, stringExternal, magicHashHexExternal, password) {
  assert(stringWallet, 'Wallet JSON required');

  // If metadata service returned 404, do not pass in a string.
  var walletJSON = JSON.parse(stringWallet);
  var externalJSON = stringExternal ? JSON.parse(stringExternal) : null;

  MyWallet.wallet = new Wallet(walletJSON);
  WalletStore.unsafeSetPassword(password);
  setIsInitialized();
  return MyWallet.wallet.loadMetadata({
    external: externalJSON
  }, {
    external: magicHashHexExternal ? Buffer.from(magicHashHexExternal, 'hex') : null
  });
};

MyWallet.checkForCompletedTrades = function (stringWallet, stringExternal, magicHashHexExternal, password, callback) {
  MyWallet.loginFromJSON(stringWallet, stringExternal, magicHashHexExternal, password).then(() => {
    let external = MyWallet.wallet.external;
    let exchange = external.coinify.hasAccount
      ? external.coinify : external.sfox.hasAccount
      ? external.sfox : null;

    if (exchange) {
      exchange.debug = true;
      let trades = exchange.trades;
      if (trades.length) {
        let pendingTrades = trades.filter(t => !t.bitcoinReceived);
        pendingTrades.forEach((t) => t.watchAddress().then(() => callback(t)));
        exchange._TradeClass._checkOnce(pendingTrades, exchange._delegate).then(() => {
          external.save();
        });
      }
    }
  });
};

/* guid: the wallet identifier
   password: to decrypt the wallet (which happens in the browser)
   server credentials:
     twoFactor: 2FA {type: ..., code: ....} or null
     sharedKey: if present, it bypasses 2FA and browser verification
   callbacks:
     needsTwoFactorCode
     wrongTwoFactorCode
     authorizationRequired: this is a new browser
     didFetch: wallet has been downloaded from the server
     didDecrypt wallet has been decrypted (with the password)
     didBuildHD: HD part of wallet has been constructed in memory */

MyWallet.login = function (guid, password, credentials, callbacks) {
  assert(credentials.twoFactor !== undefined, '2FA code must be null or set');
  assert(
    credentials.twoFactor === null ||
    (Helpers.isPositiveInteger(credentials.twoFactor.type) && Helpers.isString(credentials.twoFactor.code))
  );

  let cb = (name, reject) => (value) => {
    typeof callbacks[name] === 'function' && callbacks[name](value);
    return reject ? Promise.reject(value) : value;
  };

  let initializeWallet = () => {
    return MyWallet.initializeWallet(password, cb('didDecrypt'), cb('didBuildHD'))
      .then(() => {
        return { guid: guid };
      });
  };

  if (guid === WalletStore.getGuid() && WalletStore.getEncryptedWalletData()) {
    // If we already fetched the wallet before (e.g.
    // after user enters a wrong password), don't fetch it again:
    return initializeWallet();
  } else if (credentials.sharedKey) {
    // If the shared key is known, 2FA and browser verification are skipped.
    // No session is needed in that case.
    return WalletNetwork.fetchWalletWithSharedKey(guid, credentials.sharedKey)
      .then(cb('didFetch'))
      .then(MyWallet.didFetchWallet)
      .then(initializeWallet);
  } else {
    // If a new browser is used, wait for user to click verification link.
    let authorizationRequired = (token) => () => {
      cb('authorizationRequired')(() => {});
      return WalletNetwork.pollForSessionGUID(token);
    };

    // Estabish a session to enable 2FA and browser verification:
    return WalletNetwork.establishSession(credentials.sessionToken)
      .then(cb('newSessionToken'))
      .then(token => (
        credentials.twoFactor
          ? WalletNetwork.fetchWalletWithTwoFactor(guid, token, credentials.twoFactor).catch(cb('wrongTwoFactorCode', true))
          : WalletNetwork.fetchWallet(guid, token, cb('needsTwoFactorCode'), authorizationRequired(token))
      ),
      (error) => {
        console.error(error.message);
        return Promise.reject('Unable to establish session');
      })
      .then(cb('didFetch'))
      .then(MyWallet.didFetchWallet)
      .then(initializeWallet);
  }
};

MyWallet.didFetchWallet = function (obj) {
  if (obj.payload && obj.payload.length > 0 && obj.payload !== 'Not modified') {
    WalletStore.setEncryptedWalletData(obj.payload);
  }
  if (obj.language && WalletStore.getLanguage() !== obj.language) {
    WalletStore.setLanguage(obj.language);
  }
};

MyWallet.initializeWallet = function (pw, decryptSuccess, buildHdSuccess) {
  var doInitialize = function () {
    if (isInitialized || WalletStore.isRestoringWallet()) {
      return;
    }

    function _success () {
    }

    function _error (e) {
      WalletStore.setRestoringWallet(false);
      WalletStore.sendEvent('msg', {type: 'error', message: e});

      WalletStore.sendEvent('error_restoring_wallet');
      throw e;
    }

    WalletStore.setRestoringWallet(true);
    WalletStore.unsafeSetPassword(pw);

    MyWallet.decryptAndInitializeWallet(
      function () {
        WalletStore.setRestoringWallet(false);
        didDecryptWallet(_success);
      }
      , _error
      , decryptSuccess
      , buildHdSuccess
    );
  };

  var p = Promise.resolve().then(doInitialize);
  var incStats = function () {
    return MyWallet.wallet.incStats.bind(MyWallet.wallet)();
  };
  var saveGUID = function () {
    return MyWallet.wallet.saveGUIDtoMetadata();
  };
  var loadMetadata = function () {
    return MyWallet.wallet.loadMetadata();
  };
  p.then(incStats).catch(() => { /* ignore failure */ });
  p.then(saveGUID).catch(() => { /* ignore failure */ });
  return p.then(loadMetadata);
};

// used on iOS
MyWallet.getIsInitialized = function () {
  return isInitialized;
};

// used once
function setIsInitialized () {
  if (isInitialized) return;
  MyWallet.socketConnect();
  isInitialized = true;
}

// This should replace backup functions
function syncWallet (successcallback, errorcallback) {
  var panic = function (e) {
    console.log('Panic ' + e);
    window.location.replace('/');
    throw new Error('Save disabled.');
    // kick out of the wallet in a inconsistent state to prevent save
  };

  if (MyWallet.wallet.isEncryptionConsistent === false) {
    panic('The wallet was not fully enc/decrypted');
  }

  if (!MyWallet.wallet || !MyWallet.wallet.sharedKey ||
      MyWallet.wallet.sharedKey.length === 0 ||
      MyWallet.wallet.sharedKey.length !== 36) {
    throw new Error('Cannot backup wallet now. Shared key is not set');
  }

  WalletStore.disableLogout();

  var _errorcallback = function (e) {
    WalletStore.sendEvent('on_backup_wallet_error');
    WalletStore.sendEvent('msg', {type: 'error', message: 'Error Saving Wallet: ' + e});
    // Re-fetch the wallet from server
    MyWallet.getWallet();
    // try to save again:
    // syncWallet(successcallback, errorcallback);
    errorcallback && errorcallback(e);
  };
  try {
    var method = 'update';
    var data = JSON.stringify(MyWallet.wallet, null, 2);
    var crypted = WalletCrypto.encryptWallet(
      data,
      WalletStore.getPassword(),
      WalletStore.getPbkdf2Iterations(),
      MyWallet.wallet.isUpgradedToHD ? 3.0 : 2.0
    );

    if (crypted.length === 0) {
      throw new Error('Error encrypting the JSON output');
    }

    // Now Decrypt the it again to double check for any possible corruption
    WalletCrypto.decryptWallet(crypted, WalletStore.getPassword(), function (obj) {
      try {
        var oldChecksum = WalletStore.getPayloadChecksum();
        WalletStore.sendEvent('on_backup_wallet_start');
        WalletStore.setEncryptedWalletData(crypted);
        var newChecksum = WalletStore.getPayloadChecksum();
        var data = {
          length: crypted.length,
          payload: crypted,
          checksum: newChecksum,
          method: method,
          format: 'plain',
          language: WalletStore.getLanguage()
        };

        if (Helpers.isHex(oldChecksum)) {
          data.old_checksum = oldChecksum;
        }

        if (WalletStore.isSyncPubKeys()) {
          // Include HD addresses unless in lame mode:
          var hdAddresses = [];
          if (MyWallet.wallet.hdwallet !== undefined && MyWallet.wallet.hdwallet.accounts !== undefined) {
            var subscribeAccount = function (acc) {
              var ri = acc.receiveIndex;
              var labeled = acc.labeledReceivingAddresses ? acc.labeledReceivingAddresses : [];
              var getAddress = function (i) { return acc.receiveAddressAtIndex(i + ri); };
              return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(getAddress).concat(labeled);
            };
            hdAddresses = MyWallet.wallet.hdwallet.accounts.map(subscribeAccount).reduce(function (a, b) { return a.concat(b); }, []);
          }
          data.active = hdAddresses.concat(MyWallet.wallet.activeAddresses).join('|');
        }

        API.securePostCallbacks(
            'wallet',
            data,
            function (data) {
              WalletNetwork.checkWalletChecksum(
                  newChecksum,
                  function () {
                    WalletStore.setIsSynchronizedWithServer(true);
                    WalletStore.enableLogout();
                    WalletStore.sendEvent('on_backup_wallet_success');
                    successcallback && successcallback();
                  },
                  function () {
                    _errorcallback('Checksum Did Not Match Expected Value');
                    WalletStore.enableLogout();
                  }
              );
            },
            function (e) {
              WalletStore.enableLogout();
              _errorcallback(e);
            }
        );
      } catch (e) {
        _errorcallback(e);
        WalletStore.enableLogout();
      }
    }, function (e) {
      console.log(e);
      throw new Error('Decryption failed');
    });
  } catch (e) {
    _errorcallback(e);
    WalletStore.enableLogout();
  }
}
MyWallet.syncWallet = Helpers.asyncOnce(syncWallet, 1500, function () {
  console.log('SAVE CALLED...');
  WalletStore.setIsSynchronizedWithServer(false);
});

/**
 * @param {string} inputedEmail user email
 * @param {string} inputedPassword user main password
 * @param {string} languageCode fiat currency code (e.g. USD)
 * @param {string} currencyCode language code (e.g. en)
 * @param {function (string, string, string)} success callback function with guid, sharedkey and password
 * @param {function (string)} error callback function with error message
 * @param {string} mnemonic: optional BIP 39 mnemonic
 * @param {string} bip39Password: optional BIP 39 passphrase
 */

 // used on mywallet, iOS and frontend
MyWallet.createNewWallet = function (inputedEmail, inputedPassword, firstAccountName, languageCode, currencyCode, successCallback, errorCallback) {
  var success = function (createdGuid, createdSharedKey, createdPassword, sessionToken) {
    if (languageCode) {
      WalletStore.setLanguage(languageCode);
    }

    WalletStore.unsafeSetPassword(createdPassword);
    successCallback(createdGuid, createdSharedKey, createdPassword, sessionToken);
  };

  var saveWallet = function (wallet) {
    // Generate a session token to facilitate future login attempts:
    WalletNetwork.establishSession(null).then(function (sessionToken) {
      var extra = {email: inputedEmail};

      if (languageCode) {
        extra.language = languageCode;
      }

      if (currencyCode) {
        extra.currency = currencyCode;
      }

      WalletNetwork.insertWallet(wallet.guid, wallet.sharedKey, inputedPassword, extra, undefined, sessionToken).then(function () {
        success(wallet.guid, wallet.sharedKey, inputedPassword, sessionToken);
      }).catch(function (e) {
        errorCallback(e);
      });
    });
  };

  try {
    var mnemonic = BIP39.generateMnemonic(undefined, RNG.run.bind(RNG));
    WalletSignup.generateNewWallet(inputedPassword, inputedEmail, mnemonic, undefined, firstAccountName, saveWallet, errorCallback);
  } catch (e) {
    errorCallback(e);
  }
};

// used on frontend
MyWallet.recoverFromMnemonic = function (inputedEmail, inputedPassword, mnemonic, bip39Password, successCallback, error, startedRestoreHDWallet, accountProgress, generateUUIDProgress, decryptWalletProgress) {
  var walletGenerated = function (wallet) {
    var saveWallet = function () {
      // Generate a session token to facilitate future login attempts:
      WalletNetwork.establishSession(null).then(function (sessionToken) {
        WalletNetwork.insertWallet(wallet.guid, wallet.sharedKey, inputedPassword, {email: inputedEmail}, decryptWalletProgress, sessionToken).then(function () {
          successCallback({guid: wallet.guid, sharedKey: wallet.sharedKey, password: inputedPassword, sessionToken: sessionToken});
        });
      });
    };

    WalletStore.unsafeSetPassword(inputedPassword);
    startedRestoreHDWallet && startedRestoreHDWallet();
    wallet.scanBip44(undefined, accountProgress).then(saveWallet).catch(error);
  };

  WalletSignup.generateNewWallet(inputedPassword, inputedEmail, mnemonic, bip39Password, null, walletGenerated, error, generateUUIDProgress, decryptWalletProgress);
};

// used frontend and mywallet
MyWallet.logout = function (force) {
  if (!force && WalletStore.isLogoutDisabled()) {
    console.log('logout_prevented');
    return;
  }

  try {
    WalletStore.sendEvent('logging_out');
    window.location.reload();
  } catch (e) {
    console.log(e);
  }
};

MyWallet.endSession = function (sessionToken) {
  var data = { format: 'plain' };
  var headers = { sessionToken: sessionToken };
  return API.request('GET', 'wallet/logout', data, headers);
};

// In case of a non-mainstream browser, ensure it correctly implements the
// math needed to derive addresses from a mnemonic.
MyWallet.browserCheck = function () {
  var mnemonic = 'daughter size twenty place alter glass small bid purse october faint beyond';
  var seed = BIP39.mnemonicToSeed(mnemonic, '');
  var masterkey = Bitcoin.HDNode.fromSeedBuffer(seed, constants.getNetwork());

  var account = masterkey.deriveHardened(44).deriveHardened(0).deriveHardened(0);
  var address = account.derive(0).derive(0).getAddress();
  var answer = constants.NETWORK === 'testnet' ? 'n4hTmGM2yGmHXNFDZNXXnyYCJp1W8qoMw4' : '1QBWUDG4AFL2kFmbqoZ9y4KsSpQoCTZKRw';
  return address === answer;
};

// Takes about 100 ms on a Macbook Pro
MyWallet.browserCheckFast = function () {
  var mnemonic = 'daughter size twenty place alter glass small bid purse october faint beyond';
  var network = constants.getNetwork();

  var seed = pbkdf2.pbkdf2Sync(mnemonic, 'mnemonic', 100, 64, 'sha512');
  var seedString = seed.toString('hex');

  if (seedString !== '25357208f6fcbde803b4f333e59ce7a0ebe8b77b0390fa8b72899496f50fcc3707c65debf6102b19912cd0ccb36a2332cfebecb53e61b5fa79f11592c825bdda') {
    return false;
  }

  seed = Buffer('9f3ad67c5f1eebbffcc8314cb8a3aacbfa28046fd4b3d0af6965a8c804a603e57f5b551320eca4017267550e5b01e622978c133f2085c5999f7ef57a340d0ae2', 'hex');

  var vectors = {
    'bitcoin': {
      priv: 'xprv9s21ZrQH143K44XyzPUorz65tsvifDFiWZRoqeM69iTeYXd5KbSrz4WEAbWwB2CY6jCGJ2pKdXgw66oQPePPifrpxhWuGoDkumMGCZQwduP',
      pub: 'xpub682P4gW4PvBwugpzCZoKp3QMZRcj6KTakpZ5jwZXZuv1nvYkPbcT84PNVk1vSKnf1XtLRfTzuwqRH6y7T2HYKRWohWHLDpEv2sfeqPCAFkH',
      address: '1MGULYKjmADKfZG6BpWwQQ3qVw622HqhCR',
      pubChild: 'xpub6BQQYoWs7yyp2oNXYABTjjfmcJNJN1vHogwZ9qFdRPAfYhh5EDrBH63MHdjv5uvaawU3E3HTDGZ4SWDhwDjtnmP2S7A3EyYoQiZdFaFju5e'
    },
    'testnet': {
      priv: 'tprv8ZgxMBicQKsPesmWexLK2di5D1LvtjHir7Lvi4mYdgx8L8NAJxncVosg5mgbBParUAj3J8S5ntGjYxM9WrjLXj8RVLjCw9wops6geJMEiVB',
      pub: 'tpubD8Q1avKk7C9QBV1qeknR1xjitYiP5hxeJT9P6VcfupfuYDDTTpTYGW4Cjn6hxpjtoSRF3EysT3fTyHTiqt8nCry6m72duLu9cqG4bRT3wcX',
      address: 'n1nRdbQiaBeaSfjhuPVKEKGAMvgiuxaDHY',
      pubChild: 'tpubDBn353LYqFwGJbZNzMAYwf18wRTxMQRMMKXrWPJmmHvZHzMnJShGRXiBXfphcQspNqzwqcoKkNP78giKL5b8gCqKVhuLvWD2zgA31b1vXZE'
    }
  }[constants.NETWORK];

  // master node -> xpriv (1 ms)
  var masterkey = Bitcoin.HDNode.fromSeedBuffer(seed, network);
  var priv = masterkey.toString();

  if (priv !== vectors.priv) {
    return false;
  }

  // xpriv -> xpriv' (100 ms)
  // var xprivChild = masterkey.derive(0);
  // if (xprivChild.toString() !== 'xprv9u32fAyAZYdehCkX6YGKSuTd1PnEgrjjPbdUwZ9v1aP2v8Dbr4JCaG4teSc9YNScsXeKGRhSHkimo4W6qefVUnT9eAuiL7yDRMbwf6McJBY') {
  //   return false;
  // }

  // xpriv -> xpub, test .neutered() // 100 ms
  // var xprivChild = Bitcoin.HDNode.fromBase58('xprv9u32fAyAZYdehCkX6YGKSuTd1PnEgrjjPbdUwZ9v1aP2v8Dbr4JCaG4teSc9YNScsXeKGRhSHkimo4W6qefVUnT9eAuiL7yDRMbwf6McJBY');
  // var xpub = xprivChild.neutered();
  // if (xpub.toString() !== 'xpub682P4gW4PvBwugpzCZoKp3QMZRcj6KTakpZ5jwZXZuv1nvYkPbcT84PNVk1vSKnf1XtLRfTzuwqRH6y7T2HYKRWohWHLDpEv2sfeqPCAFkH') {
  //   return false;
  // }

  var pub = Bitcoin.HDNode.fromBase58(vectors.pub, network);

  // xpub -> address // 2 ms
  if (pub.getAddress() !== vectors.address) {
    return false;
  }

  // xpub -> xpub' // 100 ms
  var pubChild = pub.derive(0);

  if (pubChild.toString() !== vectors.pubChild) {
    return false;
  }

  return true;
};
