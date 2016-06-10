'use strict';

var assert = require('assert');

var WalletStore = require('./wallet-store.js');
var MyWallet = require('./wallet.js');
var API = require('./api');

function get_account_info (success, error) {
  API.securePostCallbacks('wallet', {method: 'get-info', format: 'json'}, function (data) {
    typeof (success) === 'function' && success(data);
  }, function (data) {
    var response = data.responseText || 'Error Downloading Account Settings';
    WalletStore.sendEvent('msg', {type: 'error', message: response});

    typeof (error) === 'function' && error();
  });
}

function updateKV (method, value, success, error, extra) {
  if (typeof value === 'string') {
    value = value.trim();
  }

  extra = extra || '';

  API.securePostCallbacks('wallet' + extra, { length: (value + '').length, payload: value + '', method: method }, function (data) {
    WalletStore.sendEvent('msg', {type: 'success', message: method + '-success: ' + data});

    typeof (success) === 'function' && success();
  }, function (data) {
    WalletStore.sendEvent('msg', {type: 'error', message: method + '-error: ' + data});

    typeof (error) === 'function' && error();
  });
}

/**
 * @param {string} ips Multiple ip addresses should be comma separated. Use % as a wildcard. For example 127.0.0.% to whitelist 127.0.0.1-127.0.0.254.
 * @param {function ()} success success callback function
 * @param {function ()} error error callback function
 */
function update_IP_lock (ips, success, error) {
  updateKV('update-ip-lock', ips, success, error);
}

function update_IP_lock_on (enabled, success, error) {
  updateKV('update-ip-lock-on', enabled ? true : false, success, error);
}

function change_language (language, success, error) {
  updateKV('update-language', language, success, error);
}

function change_local_currency (code, success, error) {
  updateKV('update-currency', code, success, error);
}

function change_btc_currency (code, success, error) {
  updateKV('update-btc-currency', code, success, error);
}

function update_tor_ip_block (enabled, success, error) {
  updateKV('update-block-tor-ips', enabled ? 1 : 0, success, error);
}

function isBadPasswordHint (value) {
  if (value.split('').some(function (c) { return c.charCodeAt(0) > 255; })) {
    return 101; // invalid charset
  } else if (WalletStore.getPassword() === value) {
    return 102; // password hint cannot be main wallet pass
  } else if (MyWallet.wallet.isDoubleEncrypted && MyWallet.wallet.validateSecondPassword(value)) {
    return 103; // password hint cannot be second passord
  } else {
    return false;
  }
}

function update_password_hint1 (value, success, error) {
  assert(error && typeof (error) === 'function', 'Error callback required');

  var isBad = isBadPasswordHint(value);
  isBad ? error(isBad) : updateKV('update-password-hint1', value, success, error);
}

function update_password_hint2 (value, success, error) {
  assert(error && typeof (error) === 'function', 'Error callback required');

  var isBad = isBadPasswordHint(value);
  isBad ? error(isBad) : updateKV('update-password-hint2', value, success, error);
}

function change_email (email, success, error) {
  updateKV('update-email', email, success, error);
}

function changeMobileNumber (val, success, error) {
  updateKV('update-sms', val, success, error);
}

// Logging levels:
// 0 - Logging disabled
// 1 - Log actions with hashed IP addresses
// 2 - Log actions with IP addresses and user agents
function updateLoggingLevel (val, success, error) {
  updateKV('update-logging-level', val, success, error);
}

function toggleSave2FA (val, success, error) {
  updateKV('update-never-save-auth-type', val ? true : false, success, error);
}

function updateAuthType (val, success, error) {
  updateKV('update-auth-type', val, function () {
    WalletStore.setRealAuthType(val);
    typeof (success) === 'function' && success();
  }, error);
}

function unsetTwoFactor (success, error) {
  updateAuthType(0, success, error);
}

function setTwoFactorSMS (success, error) {
  updateAuthType(5, success, error);
}

function setTwoFactorYubiKey (code, success, error) {
  assert(code, 'Activation code required');
  assert(success, 'Success callback required');
  assert(error, 'Error callback required');

  // Tell the server about the YubiKey and then enable 2FA with it:
  updateKV(
    'update-yubikey',
    code,
    function () {
      updateAuthType(1, success, error);
    },
    function () {
      error('Failed to configure Yubikey');
    }
  );
}

function setTwoFactorEmail (success, error) {
  updateAuthType(2, success, error);
}

function setTwoFactorGoogleAuthenticator (success, error) {
  API.securePostCallbacks('wallet', { method: 'generate-google-secret' }, function (google_secret_url) {
    typeof (success) === 'function' && success(google_secret_url);
  }, function (data) {
    WalletStore.sendEvent('msg', {type: 'error', message: data.responseText});
    typeof (error) === 'function' && error(data.responseText);
  });
}

function confirmTwoFactorGoogleAuthenticator (code, success, error) {
  updateKV('update-auth-type', 4, function () {
    WalletStore.setRealAuthType(4);
    typeof (success) === 'function' && success();
  }, error, '?code=' + code);
}

/**
 * Resend email with verfication code.
 * @param {string} email.
 * @param {function ()} success Success callback function.
 * @param {function ()} error Error callback function.
 */
function resendEmailConfirmation (email, success, error) {
  updateKV('update-email', email, success, error);
}

/**
 * Verify email with code.
 * @param {string} code verfication code.
 * @param {function (Object)} success Success callback function.
 * @param {function ()} error Error callback function.
 */
function verifyEmail (code, success, error) {
  API.securePostCallbacks('wallet', { payload: code, length: code.length, method: 'verify-email' }, function (data) {
    WalletStore.sendEvent('msg', {type: 'success', message: data});
    typeof (success) === 'function' && success(data);
  }, function (data) {
    WalletStore.sendEvent('msg', {type: 'error', message: data});
    typeof (error) === 'function' && error();
  });
}

/**
 * Verify mobile with code.
 * @param {string} code verfication code.
 * @param {function (Object)} success Success callback function.
 * @param {function ()} error Error callback function.
 */
function verifyMobile (code, success, error) {
  API.securePostCallbacks('wallet', { payload: code, length: code.length, method: 'verify-sms' }, function (data) {
    WalletStore.sendEvent('msg', {type: 'success', message: data});
    typeof (success) === 'function' && success(data);
  }, function (data) {
    WalletStore.sendEvent('msg', {type: 'error', message: data});
    typeof (error) === 'function' && error();
  });
}

function getActivityLogs (success, error) {
  API.securePostCallbacks('wallet', {method: 'list-logs', format: 'json'}, function (data) {
    typeof (success) === 'function' && success(data);
  }, function (data) {
    var response = data.responseText || 'Error Downloading Activity Logs';
    WalletStore.sendEvent('msg', {type: 'error', message: response});
    typeof (error) === 'function' && error();
  });
}

function enableEmailNotifications (success, error) {
  API.securePostCallbacks('wallet', {
    method: 'update-notifications-type',
    length: 1,
    payload: 1
  }, function (data) {
    typeof (success) === 'function' && success(data);
  }, function (data) {
    var response = data.responseText || 'Error Enabling Email Notifications';
    WalletStore.sendEvent('msg', {type: 'error', message: response});
    typeof (error) === 'function' && error();
  });
}

function enableReceiveNotifications (success, error) {
  API.securePostCallbacks('wallet', {
    method: 'update-notifications-on',
    length: 1,
    payload: 2
  }, function (data) {
    typeof (success) === 'function' && success(data);
  }, function (data) {
    var response = data.responseText || 'Error Enabling Receive Notifications';
    WalletStore.sendEvent('msg', {type: 'error', message: response});
    typeof (error) === 'function' && error();
  });
}

function enableEmailReceiveNotifications (success, error) {
  assert(success && typeof (error) === 'function', 'Success callback required');
  assert(error && typeof (error) === 'function', 'Error callback required');

  enableEmailNotifications(
    function () {
      enableReceiveNotifications(
        success,
        error
      );
    },
    error
  );
}

function disableAllNotifications (success, error) {
  assert(success && typeof (success) === 'function', 'Success callback required');
  assert(error && typeof (error) === 'function', 'Error callback required');

  API.securePostCallbacks('wallet', {
    method: 'update-notifications-type',
    length: 1,
    payload: 0
  }, function (data) {
    success(data);
  }, function (data) {
    var response = data.responseText || 'Error Disabling Receive Notifications';
    WalletStore.sendEvent('msg', {type: 'error', message: response});
    error();
  });
}

module.exports = {
  get_account_info: get_account_info,
  update_IP_lock: update_IP_lock,
  update_IP_lock_on: update_IP_lock_on,
  change_language: change_language,
  change_local_currency: change_local_currency,
  change_btc_currency: change_btc_currency,
  update_tor_ip_block: update_tor_ip_block,
  update_password_hint1: update_password_hint1,
  update_password_hint2: update_password_hint2,
  change_email: change_email,
  changeMobileNumber: changeMobileNumber,
  updateLoggingLevel: updateLoggingLevel,
  toggleSave2FA: toggleSave2FA,
  unsetTwoFactor: unsetTwoFactor,
  setTwoFactorSMS: setTwoFactorSMS,
  setTwoFactorYubiKey: setTwoFactorYubiKey,
  setTwoFactorEmail: setTwoFactorEmail,
  setTwoFactorGoogleAuthenticator: setTwoFactorGoogleAuthenticator,
  confirmTwoFactorGoogleAuthenticator: confirmTwoFactorGoogleAuthenticator,
  resendEmailConfirmation: resendEmailConfirmation,
  verifyEmail: verifyEmail,
  verifyMobile: verifyMobile,
  getActivityLogs: getActivityLogs,
  enableEmailReceiveNotifications: enableEmailReceiveNotifications,
  disableAllNotifications: disableAllNotifications,
  // for tests only
  enableEmailNotifications: enableEmailNotifications,
  enableReceiveNotifications: enableReceiveNotifications,
  updateAuthType: updateAuthType

};
