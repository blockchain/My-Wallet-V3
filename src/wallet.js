'use strict';

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
var BlockchainSettingsAPI = require('./blockchain-settings-api');
var RNG = require('./rng');
var BIP39 = require('bip39');
var Bitcoin = require('bitcoinjs-lib');
// Intentionally not directly included in package.json:
var createHmac = require('create-hmac');

var isInitialized = false;
MyWallet.wallet = undefined;
MyWallet.ws = new BlockchainSocket();

// used locally
MyWallet.socketConnect = function() {
  MyWallet.ws.connect(onOpen, onMessage, onClose);

  var last_on_change = null;

  function onMessage (message) {
    MyWallet.getSocketOnMessage(message, last_on_change);
  }

  function onOpen () {
    WalletStore.sendEvent('ws_on_open');
    MyWallet.ws.send(MyWallet.getSocketOnOpenMessage);
  }

  function onClose () {
    WalletStore.sendEvent('ws_on_close');
  }
}

// used two times
function didDecryptWallet (success) {
  // We need to check if the wallet has changed
  MyWallet.getWallet();
  success();
}

MyWallet.getSocketOnMessage = function(message, lastOnChange) {
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

  if (obj.op == 'on_change') {
    var old_checksum = WalletStore.generatePayloadChecksum();
    var new_checksum = obj.checksum;

    if (last_on_change != new_checksum && old_checksum != new_checksum) {
      last_on_change = new_checksum;

      MyWallet.getWallet();
    }
  } else if (obj.op == 'utx') {
    WalletStore.sendEvent('on_tx_received');
    var sendOnTx = WalletStore.sendEvent.bind(null, 'on_tx');
    MyWallet.wallet.getHistory().then(sendOnTx);
  } else if (obj.op == 'block') {
    var sendOnBlock = WalletStore.sendEvent.bind(null, 'on_block');
    MyWallet.wallet.getHistory().then(sendOnBlock);
    MyWallet.wallet.latestBlock = obj.x;
  } else if (obj.op == 'pong') {
    clearTimeout(MyWallet.ws.pingTimeoutPID);
  }
}

MyWallet.getSocketOnOpenMessage = function() {
  var accounts = MyWallet.wallet.hdwallet ? MyWallet.wallet.hdwallet.activeXpubs : [];
  return MyWallet.ws.msgOnOpen(MyWallet.wallet.guid, MyWallet.wallet.activeAddresses, accounts);
}

// Fetch a new wallet from the server
// success(modified true/false)
// used locally and iOS
MyWallet.getWallet = function (success, error) {
  var data = {method: 'wallet.aes.json', format: 'json'};

  if (WalletStore.getPayloadChecksum() && WalletStore.getPayloadChecksum().length > 0) {
    data.checksum = WalletStore.getPayloadChecksum();
  }

  API.securePostCallbacks('wallet', data, function (obj) {
    if (!obj.payload || obj.payload == 'Not modified') {
      if (success) success();
      return;
    }

    WalletStore.setEncryptedWalletData(obj.payload);

    MyWallet.decryptAndInitializeWallet(function () {
      MyWallet.wallet.getHistory();

      if (success) success();
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

MyWallet.decryptAndInitializeWallet = function(success, error, decrypt_success, build_hd_success) {
  assert(success, 'Success callback required');
  assert(error, 'Error callback required');
  var encryptedWalletData = WalletStore.getEncryptedWalletData();

  if (encryptedWalletData == null || encryptedWalletData.length == 0) {
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
      //   throw 'Shared Key is invalid';
      // }

      // TODO: pbkdf2 iterations should be stored correctly on wallet wrapper
      if (rootContainer) {
        WalletStore.setPbkdf2Iterations(rootContainer.pbkdf2_iterations);
      }
      // If we don't have a checksum then the wallet is probably brand new - so we can generate our own
      if (WalletStore.getPayloadChecksum() == null || WalletStore.getPayloadChecksum().length == 0) {
        WalletStore.setPayloadChecksum(WalletStore.generatePayloadChecksum());
      }
      if (MyWallet.wallet.isUpgradedToHD === false) {
        WalletStore.sendEvent('hd_wallets_does_not_exist');
      }
      setIsInitialized();
      decrypt_success && decrypt_success();
      success();
    },
    error
  );
}

// used in the frontend
MyWallet.makePairingCode = function (success, error) {
  try {
    API.securePostCallbacks('wallet', { method: 'pairing-encryption-password' }, function (encryption_phrase) {
      var pwHex = new Buffer(WalletStore.getPassword()).toString('hex');
      var encrypted = WalletCrypto.encrypt(MyWallet.wallet.sharedKey + '|' + pwHex, encryption_phrase, 10);
      success('1|' + MyWallet.wallet.guid + '|' + encrypted);
    }, function (e) {
      error(e);
    });
  } catch (e) {
    error(e);
  }
};

////////////////////////////////////////////////////////////////////////////////
// guid: the wallet identifier
// password: to decrypt the wallet (which happens in the browser)
// server credentials:
//   twoFactor: 2FA {type: ..., code: ....} or null
//   sharedKey: if present, it bypasses 2FA and browser verification
// callbacks:
//   needsTwoFactorCode
//   wrongTwoFactorCode
//   authorizationRequired: this is a new browser
//   didFetch: wallet has been downloaded from the server
//   didDecrypt wallet has been decrypted (with the password)
//   didBuildHD: HD part of wallet has been constructed in memory

MyWallet.login = function (guid, password, credentials, callbacks) {
  assert(credentials.twoFactor !== undefined, '2FA code must be null or set');
  assert(
    credentials.twoFactor === null ||
    (Helpers.isPositiveInteger(credentials.twoFactor.type) && Helpers.isString(credentials.twoFactor.code))
  );

  var loginPromise = new Promise(function (resolve, reject) {
    // If the shared key is known, 2FA and browser verification are skipped.
    // No session is needed in that case.
    if(credentials.sharedKey) {
      return WalletNetwork.fetchWalletWithSharedKey(guid, credentials.sharedKey)
        .then(function (obj) {
          callbacks.didFetch && callbacks.didFetch();
          MyWallet.didFetchWallet(obj).then(function() {
            MyWallet.initializeWallet(password, callbacks.didDecrypt, callbacks.didBuildHD).then(function() {
              resolve({guid: guid});
            }).catch(function (e) {
              reject(e);
            });
          });
        })
    } else {
      // Estabish a session to enable 2FA and browser verification:
      WalletNetwork.establishSession(credentials.sessionToken)
      .then(function(token) {
        // If a new browser is used, the user receives a verification email.
        // We wait for them to click the link.
        var authorizationRequired = function() {
          var promise = new Promise(function (resolveA, rejectA) {
            if(typeof(callbacks.authorizationRequired) === 'function') {
              callbacks.authorizationRequired(function () {
                WalletNetwork.pollForSessionGUID(token).then(function () {
                  resolveA();
                }).catch(function(error) {
                  rejectA(error);
                });
              });
            }
          });
          return promise;
        };

        var needsTwoFactorCode = function (authType) {
          callbacks.needsTwoFactorCode(token, authType);
        };

        if(credentials.twoFactor) {
          WalletNetwork.fetchWalletWithTwoFactor(guid, token, credentials.twoFactor)
          .then(function (obj) {
            callbacks.didFetch && callbacks.didFetch();
            MyWallet.didFetchWallet(obj).then(function() {
              MyWallet.initializeWallet(password, callbacks.didDecrypt, callbacks.didBuildHD).then(function() {
                resolve({guid: guid, sessionToken: token});
              }).catch(function (e) {
                reject(e);
              });
            });
          }).catch(function (e) {
            callbacks.wrongTwoFactorCode(e);
          });

        } else {
          // Try without 2FA:
          WalletNetwork.fetchWallet(guid, token, needsTwoFactorCode, authorizationRequired)
          .then(function (obj) {
            callbacks.didFetch && callbacks.didFetch();
            MyWallet.didFetchWallet(obj).then(function() {
              MyWallet.initializeWallet(password, callbacks.didDecrypt, callbacks.didBuildHD).then(function() {
                resolve({guid: guid, sessionToken: token});
              }).catch(function (e) {
                reject(e);
              });
            });
          }).catch(function (e) {
            reject(e);
          });
        }

      }).catch(function (error) {
        console.log(error.message);
        reject("Unable to establish session");
      });
    }
  });

  return loginPromise;
}

MyWallet.didFetchWallet = function(obj) {
  if (obj.payload && obj.payload.length > 0 && obj.payload != 'Not modified') {
   WalletStore.setEncryptedWalletData(obj.payload);
  }

  if (obj.language && WalletStore.getLanguage() != obj.language) {
   WalletStore.setLanguage(obj.language);
  }

  return Promise.resolve();
}

MyWallet.initializeWallet = function (pw, decrypt_success, build_hd_success) {
  var promise = new Promise(function (resolve, reject) {

    if (isInitialized || WalletStore.isRestoringWallet()) {
      return;
    }

    function _success () {
      resolve();
    }

    function _error (e) {
      WalletStore.setRestoringWallet(false);
      WalletStore.sendEvent('msg', {type: 'error', message: e});

      WalletStore.sendEvent('error_restoring_wallet');
      reject(e);
    }

    WalletStore.setRestoringWallet(true);
    WalletStore.unsafeSetPassword(pw);

    MyWallet.decryptAndInitializeWallet(
      function () {
        WalletStore.setRestoringWallet(false);
        didDecryptWallet(_success);
      }
      , _error
      , decrypt_success
      , build_hd_success
    );
  });
  return promise;
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
    throw 'Save disabled.';
    // kick out of the wallet in a inconsistent state to prevent save
  };

  if (MyWallet.wallet.isEncryptionConsistent === false) {
    panic('The wallet was not fully enc/decrypted');
  }

  if (!MyWallet.wallet || !MyWallet.wallet.sharedKey ||
      MyWallet.wallet.sharedKey.length === 0 ||
      MyWallet.wallet.sharedKey.length !== 36) {
    throw 'Cannot backup wallet now. Shared key is not set';
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
    var crypted = WalletCrypto.encryptWallet(data, WalletStore.getPassword(),
        WalletStore.getPbkdf2Iterations(), MyWallet.wallet.isUpgradedToHD ? 3.0 : 2.0);

    if (crypted.length == 0) {
      throw 'Error encrypting the JSON output';
    }

    // Now Decrypt the it again to double check for any possible corruption
    WalletCrypto.decryptWallet(crypted, WalletStore.getPassword(), function (obj) {
      try {
        var oldChecksum = WalletStore.getPayloadChecksum();
        WalletStore.sendEvent('on_backup_wallet_start');
        WalletStore.setEncryptedWalletData(crypted);
        var new_checksum = WalletStore.getPayloadChecksum();
        var data = {
          length: crypted.length,
          payload: crypted,
          checksum: new_checksum,
          method: method,
          format: 'plain',
          language: WalletStore.getLanguage()
        };

        if (Helpers.isHex(oldChecksum)) {
          data.old_checksum = oldChecksum;
        }

        if (WalletStore.isSyncPubKeys()) {
          // Include HD addresses unless in lame mode:
          var hdAddresses = (
            MyWallet.wallet.hdwallet != undefined &&
            MyWallet.wallet.hdwallet.accounts != undefined
          ) ? [].concat.apply([],
            MyWallet.wallet.hdwallet.accounts.map(function (account) {
              return account.labeledReceivingAddresses;
            })) : [];
          data.active = [].concat.apply([],
            [
              MyWallet.wallet.activeAddresses,
              hdAddresses
            ]
          ).join('|');
        }

        API.securePostCallbacks(
            'wallet',
            data,
            function (data) {
              WalletNetwork.checkWalletChecksum(
                  new_checksum,
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
      throw 'Decryption failed';
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
  var success = function (createdGuid, createdSharedKey, createdPassword) {
    if (languageCode) {
      WalletStore.setLanguage(languageCode);
      BlockchainSettingsAPI.change_language(languageCode, function () {});
    }

    if (currencyCode) {
      BlockchainSettingsAPI.change_local_currency(currencyCode, function () {});
    }

    WalletStore.unsafeSetPassword(createdPassword);
    successCallback(createdGuid, createdSharedKey, createdPassword);
  };


  var saveWallet = function (wallet) {
    WalletNetwork.insertWallet(wallet.guid, wallet.sharedKey, inputedPassword, {email: inputedEmail}).then(function () {
      success(wallet.guid, wallet.sharedKey, inputedPassword);
    }).catch(function (e) {
      errorCallback(e);
    });
  };

  try {
    var mnemonic = BIP39.generateMnemonic(undefined, RNG.run.bind(RNG));
    WalletSignup.generateNewWallet(inputedPassword, inputedEmail, mnemonic, undefined, firstAccountName, saveWallet, errorCallback);
  } catch(e) {
    errorCallback(e);
  }
};

// used on frontend
MyWallet.recoverFromMnemonic = function (inputedEmail, inputedPassword, mnemonic, bip39Password, successCallback, error, startedRestoreHDWallet, accountProgress, generateUUIDProgress, decryptWalletProgress) {
  var walletGenerated = function (wallet) {

    var saveWallet = function () {
      WalletNetwork.insertWallet(wallet.guid, wallet.sharedKey, inputedPassword, {email: inputedEmail}, decryptWalletProgress).then(function () {
        successCallback({guid: wallet.guid, sharedKey: wallet.sharedKey, password: inputedPassword});
      }, function (e) {
        error(e);
      });
    };

    WalletStore.unsafeSetPassword(inputedPassword);
    wallet.scanBip44(undefined, startedRestoreHDWallet, accountProgress).then(saveWallet).catch(error);
  };

  WalletSignup.generateNewWallet(inputedPassword, inputedEmail, mnemonic, bip39Password, null, walletGenerated, error, generateUUIDProgress, decryptWalletProgress);
};

// used frontend and mywallet
MyWallet.logout = function (sessionToken, force) {
  if (!force && WalletStore.isLogoutDisabled())
    return;

  var reload = function () {
    try { window.location.reload(); } catch (e) {
      console.log(e);
    }
  };
  var data = {format: 'plain', api_code: API.API_CODE};
  WalletStore.sendEvent('logging_out');

  var headers = {sessionToken: sessionToken};

  API.request("GET", 'wallet/logout', data, headers).then(reload).catch(reload);
};

// In case of a non-mainstream browser, ensure it correctly implements the
// math needed to derive addresses from a mnemonic.
MyWallet.browserCheck = function() {
  var mnemonic = 'daughter size twenty place alter glass small bid purse october faint beyond';
  var seed = BIP39.mnemonicToSeed(mnemonic, '');
  var masterkey = Bitcoin.HDNode.fromSeedBuffer(seed);
  var account = masterkey.deriveHardened(44).deriveHardened(0).deriveHardened(0);
  var address = account.derive(0).derive(0).getAddress();
  return address === '1QBWUDG4AFL2kFmbqoZ9y4KsSpQoCTZKRw';
}

MyWallet.browserCheckFast = function() {
  var seed = Buffer('9f3ad67c5f1eebbffcc8314cb8a3aacbfa28046fd4b3d0af6965a8c804a603e57f5b551320eca4017267550e5b01e622978c133f2085c5999f7ef57a340d0ae2', 'hex');
  var hmacSha512Expected =
    '554d80de8f1747c88d8fb01d27277d0a77ee167886737e91b03da170319858b69ff5840b791b0faaf4b83b54c65886db4ef0f7abc8d0a4e3e10add20681b744f';
  var hmacSha512 = createHmac('sha512', seed);
  hmacSha512.update('100 bottles of beer on the wall');
  var hmacSha512Output = hmacSha512.digest().toString('hex');
  return hmacSha512Output === hmacSha512Expected;
}
