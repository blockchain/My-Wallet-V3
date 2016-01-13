'use strict';

var assert = require('assert');

var API = require('./api');
var Helpers = require('./helpers');
var Q = require('q')

function postTokenEndpoint(method, token, extraParams) {
  assert(token, "Token required");
  assert(extraParams, "Extra params dictionary required");

  var defer = Q.defer();

  var success = function(res) {
    if(res && res.success !== undefined) {
      if(res.success) {
        defer.resolve(res);
      } else {
        defer.reject(res);
      }
    } else {
      defer.reject({error: 'TOKEN_ENDPOINT_UNEXPECTED_RESPONSE'});
    }
  }

  var error = function (err) {
    defer.reject(err);
  }

  var params = { token: token, method : method, api_code : API.API_CODE};

  for(var k in extraParams) {
    params[k] = extraParams[k];
  }

  API.request("POST", 'wallet', params, false).then(success).catch(error);

  return defer.promise;
}

function verifyEmail(token) {
  return this.postTokenEndpoint('verify-email-token', token, {})
}

function unsubscribe(token) {
  return this.postTokenEndpoint('unsubscribe', token, {})
}

function authorizeApprove(token, differentBrowserCallback, differentBrowserApproved) {
  assert(Helpers.isBoolean(differentBrowserApproved) || differentBrowserApproved == null, "differentBrowserApproved must be null, false or true");

  var defer = Q.defer();

  var success = function(res) {
    defer.resolve(res);
  }

  var error = function (res) {
    if (res.success === null) {
      differentBrowserCallback(res);
    } else if (res.success === false && res["request-denied"]) {
      defer.resolve(res);
    } else {
      defer.reject(res);
    }
  }

  var extraParams = {}

  if(differentBrowserApproved !== null) {
    extraParams.confirm_approval = differentBrowserApproved;
  }

  this.postTokenEndpoint('authorize-approve', token, extraParams)
    .then(success)
    .catch(error)

  return defer.promise;
}

function resetTwoFactor(token) {
  return this.postTokenEndpoint('reset-two-factor-token', token, {})
}

module.exports = {
  verifyEmail: verifyEmail,
  unsubscribe: unsubscribe,
  authorizeApprove: authorizeApprove,
  resetTwoFactor: resetTwoFactor,
  postTokenEndpoint: postTokenEndpoint // For tests
};
