'use strict';

var MyWallet = module.exports = {};

var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var ECPair = Bitcoin.ECPair;
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

var isInitialized = false;
MyWallet.wallet = undefined;
MyWallet.ws = new BlockchainSocket();

// used locally
function socketConnect () {
  MyWallet.ws.connect(onOpen, onMessage, onClose);

  var last_on_change = null;

  function onMessage (message) {
    var obj = null;

    if (!(typeof window === 'undefined')) {
      message = message.data;
    }
    try {
      obj = JSON.parse(message);
    }
    catch (e) {
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

    }  else if (obj.op == 'block') {
      var sendOnBlock = WalletStore.sendEvent.bind(null, 'on_block');
      MyWallet.wallet.getHistory().then(sendOnBlock);
      MyWallet.wallet.latestBlock = obj.x;

    }  else if (obj.op == 'pong') {
      clearTimeout(MyWallet.ws.pingTimeoutPID);
    }
  }

  function onOpen () {
    WalletStore.sendEvent('ws_on_open');
    var accounts = MyWallet.wallet.hdwallet? MyWallet.wallet.hdwallet.activeXpubs : [];
    var msg = MyWallet.ws.msgOnOpen(MyWallet.wallet.guid, MyWallet.wallet.activeAddresses, accounts);
    MyWallet.ws.send(msg);
  }

  function onClose () {
    WalletStore.sendEvent('ws_on_close');
  }
}

// used two times
function didDecryptWallet (success) {

  //We need to check if the wallet has changed
  MyWallet.getWallet();
  success();
}

//Fetch a new wallet from the server
//success(modified true/false)
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

    decryptAndInitializeWallet(function () {
      MyWallet.wallet.getHistory();

      if (success) success();
    }, function () {
      // When re-fetching the wallet after a remote update, if we can't decrypt
      // it, logout for safety.
      MyWallet.logout(true);
      if (error) error(
      );
    });
  }, function (e) {
    if (error) error();
  });
};

////////////////////////////////////////////////////////////////////////////////

function decryptAndInitializeWallet (success, error, decrypt_success, build_hd_success) {
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
      decrypt_success && decrypt_success();
      MyWallet.wallet = new Wallet(obj);

      // this sanity check should be done on the load
      // if (!sharedKey || sharedKey.length == 0 || sharedKey.length != 36) {
      //   throw 'Shared Key is invalid';
      // }

      // TODO: pbkdf2 iterations should be stored correctly on wallet wrapper
      if (rootContainer) {
        WalletStore.setPbkdf2Iterations(rootContainer.pbkdf2_iterations);
      }
      //If we don't have a checksum then the wallet is probably brand new - so we can generate our own
      if (WalletStore.getPayloadChecksum() == null || WalletStore.getPayloadChecksum().length == 0) {
        WalletStore.setPayloadChecksum(WalletStore.generatePayloadChecksum());
      }
      if (MyWallet.wallet.isUpgradedToHD === false) {
        WalletStore.sendEvent('hd_wallets_does_not_exist');
      }
      setIsInitialized();
      success();
    },
    error
  );
}

////////////////////////////////////////////////////////////////////////////////

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
MyWallet.login = function (user_guid, shared_key, inputedPassword, twoFA, success, needs_two_factor_code,
                           wrong_two_factor_code, authorization_required, other_error, fetch_success,
                           decrypt_success, build_hd_success) {

  assert(success, 'Success callback required');
  assert(other_error, 'Error callback required');
  assert(twoFA !== undefined, '2FA code must be null or set');
  assert(
    twoFA === null ||
    Helpers.isString(twoFA) ||
    (Helpers.isPositiveInteger(twoFA.type) && Helpers.isString(twoFA.code))
  );

  var clientTime = (new Date()).getTime();
  var data = { format: 'json', resend_code: null, ct: clientTime, api_code: API.API_CODE };

  if (shared_key) { data.sharedKey = shared_key; }

  var tryToFetchWalletJSON = function (guid, successCallback) {

    var success = function (obj) {
      fetch_success && fetch_success();
      // Even if Two Factor is enabled, some settings need to be saved here,
      // because they won't be part of the 2FA response.

      if (!obj.guid) {
        WalletStore.sendEvent('msg', {type: 'error', message: 'Server returned null guid.'});
        other_error('Server returned null guid.');
        return;
      }

      // I should create a new class to store the encrypted wallet over wallet
      WalletStore.setGuid(obj.guid);
      WalletStore.setRealAuthType(obj.real_auth_type);
      WalletStore.setSyncPubKeys(obj.sync_pubkeys);

      if (obj.payload && obj.payload.length > 0 && obj.payload != 'Not modified') {
      } else {
        needs_two_factor_code(obj.auth_type);
        return;
      }
      successCallback(obj)
    };

    var error = function (e) {
       console.log(e);
       var obj = 'object' === typeof e ? e : JSON.parse(e);
       if (obj && obj.initial_error && !obj.authorization_required) {
         other_error(obj.initial_error);
         return;
       }
       WalletStore.sendEvent('did_fail_set_guid');
       if (obj.authorization_required && typeof (authorization_required) === 'function') {
         authorization_required(function () {
           MyWallet.pollForSessionGUID(function () {
             tryToFetchWalletJSON(guid, successCallback);
           });
         });
       }
       if (obj.initial_error) {
         WalletStore.sendEvent('msg', {type: 'error', message: obj.initial_error});
       }
    };
    API.request('GET', 'wallet/' + guid, data, true, false).then(success).catch(error);
  };

  var tryToFetchWalletWith2FA = function (guid, two_factor_auth, successCallback) {

    if (Helpers.isString(two_factor_auth)) {
      two_factor_auth = {
        type: null,
        code: two_factor_auth
      };
    }

    if (two_factor_auth.code == null) {
      other_error('Two Factor Authentication code this null');
      return;
    }
    if (two_factor_auth.code.length == 0 || two_factor_auth.code.length > 255) {
     other_error('You must enter a Two Factor Authentication code');
     return;
    }

    var two_factor_auth_key = two_factor_auth.code;

    switch (two_factor_auth.type) {
      case 2: // email
      case 4: // sms
      case 5: // Google Auth
        two_factor_auth_key = two_factor_auth_key.toUpperCase();
      break;
    }

    var success = function (data) {
     if (data == null || data.length == 0) {
       other_error('Server Return Empty Wallet Data');
       return;
     }
     if (data != 'Not modified') { WalletStore.setEncryptedWalletData(data); }
     successCallback(data);
    };
    var error = function (response) {
     WalletStore.setRestoringWallet(false);
     wrong_two_factor_code(response);
    };

    var myData = { guid: guid, payload: two_factor_auth_key, length: two_factor_auth_key.length,  method: 'get-wallet', format: 'plain', api_code: API.API_CODE};
    API.request('POST', 'wallet', myData, true, false).then(success).catch(error);
  };

  var didFetchWalletJSON = function (obj) {
    if (obj.payload && obj.payload.length > 0 && obj.payload != 'Not modified') {
     WalletStore.setEncryptedWalletData(obj.payload);
    }

    if (obj.language && WalletStore.getLanguage() != obj.language) {
     WalletStore.setLanguage(obj.language);
    }
    MyWallet.initializeWallet(inputedPassword, success, other_error, decrypt_success, build_hd_success);
  }

  if (twoFA == null) {
    tryToFetchWalletJSON(user_guid, didFetchWalletJSON)
  } else {
    // If 2FA is enabled and we already fetched the wallet before, don't fetch
    // it again
    if (user_guid === WalletStore.getGuid() && WalletStore.getEncryptedWalletData()) {
      MyWallet.initializeWallet(inputedPassword, success, other_error, decrypt_success, build_hd_success);
    } else {
      tryToFetchWalletWith2FA(user_guid, twoFA, didFetchWalletJSON)
    }
  }
};
////////////////////////////////////////////////////////////////////////////////

// used locally
MyWallet.pollForSessionGUID = function (successCallback) {

  if (WalletStore.isPolling()) return;
  WalletStore.setIsPolling(true);
  var data = {format: 'json'};
  var success = function (obj) {
    if (obj.guid) {
      WalletStore.setIsPolling(false);
      WalletStore.sendEvent('msg', {type: 'success', message: 'Authorization Successful'});
      successCallback()
    } else {
      if (WalletStore.getCounter() < 600) {
        WalletStore.incrementCounter();
        setTimeout(function () {
          API.request('GET', 'wallet/poll-for-session-guid', data, true, false).then(success).catch(error);
        }, 2000);
      } else {
        WalletStore.setIsPolling(false);
      }
    }
  }
  var error = function () {
    WalletStore.setIsPolling(false);
  }
  API.request('GET', 'wallet/poll-for-session-guid', data, true, false).then(success).catch(error);
};
// used locally
////////////////////////////////////////////////////////////////////////////////

MyWallet.initializeWallet = function (pw, success, other_error, decrypt_success, build_hd_success) {
  assert(success, 'Success callback required');
  assert(other_error, 'Error callback required');
  if (isInitialized || WalletStore.isRestoringWallet()) {
    return;
  }

  function _error (e) {
    WalletStore.setRestoringWallet(false);
    WalletStore.sendEvent('msg', {type: 'error', message: e});

    WalletStore.sendEvent('error_restoring_wallet');
    other_error(e);
  }

  WalletStore.setRestoringWallet(true);
  WalletStore.unsafeSetPassword(pw);

  decryptAndInitializeWallet(
      function () {
        WalletStore.setRestoringWallet(false);
        didDecryptWallet(success);
      },
      _error,
      decrypt_success,
      build_hd_success
  );
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// used on iOS
MyWallet.getIsInitialized = function () {
  return isInitialized;
};

// used once
function setIsInitialized () {
  if (isInitialized) return;
  socketConnect();
  isInitialized = true;
}

////////////////////////////////////////////////////////////////////////////////
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

  if (!MyWallet.wallet || !MyWallet.wallet.sharedKey
      || MyWallet.wallet.sharedKey.length === 0
      || MyWallet.wallet.sharedKey.length !== 36)
 { throw 'Cannot backup wallet now. Shared key is not set'; };

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
        WalletStore.getPbkdf2Iterations(), MyWallet.wallet.isUpgradedToHD ?  3.0 : 2.0 );

    if (crypted.length == 0) {
      throw 'Error encrypting the JSON output';
    }

    //Now Decrypt the it again to double check for any possible corruption
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
              return account.labeledReceivingAddresses
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
    },
                               function (e) {
                                 console.log(e);
                                 throw('Decryption failed');
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
 */
 // used on mywallet, iOS and frontend
MyWallet.createNewWallet = function (inputedEmail, inputedPassword, firstAccountName, languageCode, currencyCode, success, error, isHD) {
  WalletSignup.generateNewWallet(inputedPassword, inputedEmail, firstAccountName, function (createdGuid, createdSharedKey, createdPassword) {
    if (languageCode) {
      WalletStore.setLanguage(languageCode);
      BlockchainSettingsAPI.change_language(languageCode, (function () {}));
    }

    if (currencyCode) {
      BlockchainSettingsAPI.change_local_currency(currencyCode, (function () {}));
    }

    WalletStore.unsafeSetPassword(createdPassword);
    success(createdGuid, createdSharedKey, createdPassword);
  }, function (e) {
    error(e);
  }, isHD);
};

// used on frontend
MyWallet.recoverFromMnemonic = function (inputedEmail, inputedPassword, recoveryMnemonic, bip39Password, success, error, startedRestoreHDWallet, accountProgress, generateUUIDProgress, decryptWalletProgress) {
  var walletSuccess = function (guid, sharedKey, password) {
    WalletStore.unsafeSetPassword(password);
    var runSuccess = function () { success({guid: guid, sharedKey: sharedKey, password: password}); };
    MyWallet.wallet.restoreHDWallet(recoveryMnemonic, bip39Password, undefined, startedRestoreHDWallet, accountProgress).then(runSuccess).catch(error);
  };
  WalletSignup.generateNewWallet(inputedPassword, inputedEmail, null, walletSuccess, error, true, generateUUIDProgress, decryptWalletProgress);
};

// used frontend and mywallet
MyWallet.logout = function (force) {
  if (!force && WalletStore.isLogoutDisabled()) {
    return;
  }
  var reload = function () {
    try { window.location.reload(); } catch (e) {
      console.log(e);
    }
  };
  var data = {format: 'plain', api_code: API.API_CODE};
  WalletStore.sendEvent('logging_out');

  API.request("GET", 'wallet/logout', data, true, false).then(reload).catch(reload);
};
