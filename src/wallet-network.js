'use strict';

var API = require('./api');
var Q = require('q')

function generateUUIDs(n) {
  var defer = Q.defer();

  var succ = function(data) {
    if (data.uuids && data.uuids.length == n) {
      defer.resolve(data.uuids);
    } else {
      defer.reject('Unknown Error');
    }
  };
  var err = function(data) {
    defer.reject(data);
  };

  var data = {
      format: 'json'
    , n: n
    , api_code : API.API_CODE
  };

  API.retry(API.request.bind(API, "GET", "uuid-generator", data))
    .then(succ)
    .catch(err);

  return defer.promise;
};

/**
 * Fetch information on wallet identfier with resend code set to true
 * @param {string} user_guid User GUID.
 */
// used in the frontend
function resendTwoFactorSms(user_guid) {
  var defer = Q.defer();

  var data = {
    format : 'json',
    resend_code : true,
    ct : (new Date()).getTime(),
    api_code : API.API_CODE
  }
  var s = function(obj) { defer.resolve(); }
  var e = function(e) {
    if(e.responseJSON && e.responseJSON.initial_error) {
      defer.reject(e.responseJSON.initial_error);
    } else {
      defer.reject();
    }
  }
  API.request("GET", 'wallet/'+user_guid, data, true, false).then(s).catch(e);

  return defer.promise;
};

/**
 * Trigger an email with the users wallet guid(s)
 * @param {string} user_email Registered mail address.
 * @param {string} captcha Spam protection
 */
// used in the frontend
function recoverGuid(user_email, captcha) {
  var defer = Q.defer();

  var data = {
    method: 'recover-wallet',
    email : user_email,
    captcha: captcha,
    ct : (new Date()).getTime(),
    api_code : API.API_CODE
  }
  var s = function(obj) {
    if(obj.success) {
      defer.resolve(obj.message);
    } else {
      defer.reject(obj.message);
    }
  }
  var e = function(e) {
    if(e.responseJSON && e.responseJSON.initial_error) {
      defer.reject(e.responseJSON.initial_error);
    } else {
      defer.reject();
    }
  }
  API.request("POST", 'wallet', data, true).then(s).catch(e);

  return defer.promise;
};

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

  var defer = Q.defer();

  var data = {
    method: 'reset-two-factor-form',
    guid: user_guid,
    email: user_email,
    contact_email: user_new_email,
    secret_phrase: secret,
    message: message,
    kaptcha: captcha,
    ct : (new Date()).getTime(),
    api_code : API.API_CODE
  }
  var s = function(obj) {
    if(obj.success) {
      defer.resolve(obj.message);
    } else {
      defer.reject(obj.message);
    }
  }
  var e = function(e) {
    defer.reject(e);
  }
  API.request("POST", 'wallet', data, true).then(s).catch(e);

  return defer.promise;
};

module.exports = {
  generateUUIDs: generateUUIDs,
  resendTwoFactorSms: resendTwoFactorSms,
  recoverGuid: recoverGuid,
  requestTwoFactorReset: requestTwoFactorReset
}
