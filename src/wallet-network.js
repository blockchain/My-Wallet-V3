'use strict';

var API = require('./api');
var Helpers = require('./helpers');
var WalletCrypto = require('./wallet-crypto');
var MyWallet = require('./wallet');


function handleError (msg) {
  return function(e) {
    var errMsg = e.responseJSON && e.responseJSON.initial_error
        ? e.responseJSON.initial_error
        : e || msg;
    throw errMsg;
  }
}

function handleResponse (obj) {
  if (obj.success) return obj.message;
  else throw obj.message;
}

function generateUUIDs(count) {

  var data = {
    format: 'json',
    n: count,
    api_code: API.API_CODE
  };

  var extractUUIDs = function (data) {
    if (!data.uuids || data.uuids.length != count)
      throw 'Could not generate uuids';
    return data.uuids;
  };

  return API.retry(API.request.bind(API, 'GET', 'uuid-generator', data))
    .then(extractUUIDs);
}

/**
 * Fetch information on wallet identfier with resend code set to true
 * @param {string} user_guid User GUID.
 */
// used in the frontend and in iOS
function resendTwoFactorSms(user_guid) {

  var data = {
    format : 'json',
    resend_code : true,
    ct : Date.now(),
    api_code : API.API_CODE
  };

  return API.request('GET', 'wallet/' + user_guid, data, true, false)
    .catch(handleError('Could not resend two factor sms'));
}

/**
 * Trigger an email with the users wallet guid(s)
 * @param {string} user_email Registered mail address.
 * @param {string} captcha Spam protection
 */
// used in the frontend
function recoverGuid(user_email, captcha) {

  var data = {
    method: 'recover-wallet',
    email : user_email,
    captcha: captcha,
    ct : Date.now(),
    api_code : API.API_CODE
  };

  return API.request('POST', 'wallet', data, true)
    .then(handleResponse).catch(handleError('Could not send recovery email'));
}

/**
 * Trigger the 2FA reset process
 * @param {string} user_guid User GUID.
 * @param {string} user_email Registered email address.
 * @param {string} user_new_email Optional new email address.
 * @param {string} secret
 * @param {string} message
 * @param {string} captcha Spam protection
 */
// used in the frontend
function requestTwoFactorReset(
  user_guid,
  user_email,
  user_new_email,
  secret,
  message,
  captcha) {

  var data = {
    method: 'reset-two-factor-form',
    guid: user_guid,
    email: user_email,
    contact_email: user_new_email,
    secret_phrase: secret,
    message: message,
    kaptcha: captcha,
    ct : Date.now(),
    api_code : API.API_CODE
  };

  return API.request('POST', 'wallet', data, true)
    .then(handleResponse);
}

// Save the javascript wallet to the remote server
function insertWallet (guid, sharedKey, password, extra, decryptWalletProgress) {
  assert(guid, "GUID missing");
  assert(sharedKey, "Shared Key missing");
  assert(password, "Password missing");
  assert(typeof decryptWalletProgress == 'function', "decryptWalletProgress must be a function");

  return new Promise(function(resolve, reject) {
    // var data = MyWallet.makeCustomWalletJSON(null, guid, sharedKey);
    var data = JSON.stringify(MyWallet.wallet, null, 2);

    //Everything looks ok, Encrypt the JSON output
    var crypted = WalletCrypto.encryptWallet(data, password, MyWallet.wallet.defaultPbkdf2Iterations,  MyWallet.wallet.isUpgradedToHD ?  3.0 : 2.0);

    if (crypted.length == 0) {
      reject('Error encrypting the JSON output');
    }

    decryptWalletProgress && decryptWalletProgress();

    //Now Decrypt the it again to double check for any possible corruption
    try {
      WalletCrypto.decryptWalletSync(crypted, password);
    } catch (e) {
      reject(e);
    }

    //SHA256 new_checksum verified by server in case of corruption during transit
    var new_checksum = WalletCrypto.sha256(crypted).toString('hex');

    extra = extra || {};

    var post_data = {
      length: crypted.length,
      payload: crypted,
      checksum: new_checksum,
      method : 'insert',
      format : 'plain',
      sharedKey : sharedKey,
      guid : guid
    };

    Helpers.merge(post_data, extra);
    API.securePost('wallet', post_data, resolve, reject);

  });
}

module.exports = {
  insertWallet: insertWallet,
  generateUUIDs: generateUUIDs,
  resendTwoFactorSms: resendTwoFactorSms,
  recoverGuid: recoverGuid,
  requestTwoFactorReset: requestTwoFactorReset
};
