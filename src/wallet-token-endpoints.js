'use strict';

var assert = require('assert');

var API = require('./api');
var Helpers = require('./helpers');

function postTokenEndpoint(method, token, extraParams, successCallback, errorCallback) {
  assert(token, "Token required");
  assert(extraParams, "Extra params dictionary required");
  assert(successCallback, "Success callback required");
  assert(errorCallback, "Error callback required");

  var success = function(res) {
    console.log(res);
    if(res && res.success !== undefined) {
      if(res.success) {
        successCallback(res);
      } else {
        errorCallback(res);
      }
    } else {
      errorCallback({error: 'TOKEN_ENDPOINT_UNEXPECTED_RESPONSE'});
    }
  }

  var error = function (err) {
    errorCallback(err);
  }

  var params = { token: token, method : method, api_code : API.API_CODE};

  for(var k in extraParams) {
    params[k] = extraParams[k];
  }

  API.request("POST", 'wallet', params, false).then(success).catch(error);
}

function verifyEmail(token, successCallback, errorCallback) {
  this.postTokenEndpoint('verify-email-token', token, {}, successCallback, errorCallback)
}

function unsubscribe(token, successCallback, errorCallback) {
  this.postTokenEndpoint('unsubscribe', token, {}, successCallback, errorCallback)
}

function authorizeApprove(token, successCallback, differentBrowserCallback, differentBrowserApproved, errorCallback) {
  assert(Helpers.isBoolean(differentBrowserApproved) || differentBrowserApproved == null, "differentBrowserApproved must be null, false or true");

  var error = function (res) {
    if (res.success === null) {
      differentBrowserCallback(res);
    } else if (res.success === false && res["request-denied"]) {
      successCallback();
    } else {
      errorCallback(res);
    }
  }

  var extraParams = {}

  if(differentBrowserApproved !== null) {
    extraParams.confirm_approval = differentBrowserApproved;
  }

  this.postTokenEndpoint('authorize-approve', token, extraParams, successCallback, error)
}

function resetTwoFactor(token, successCallback, errorCallback) {
  this.postTokenEndpoint('reset-two-factor-token', token, {}, successCallback, errorCallback)
}

module.exports = {
  verifyEmail: verifyEmail,
  unsubscribe: unsubscribe,
  authorizeApprove: authorizeApprove,
  resetTwoFactor: resetTwoFactor,
  postTokenEndpoint: postTokenEndpoint // For tests
};
