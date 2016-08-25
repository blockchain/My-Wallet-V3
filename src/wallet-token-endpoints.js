'use strict';

var assert = require('assert');

var API = require('./api');
var Helpers = require('./helpers');

function postTokenEndpoint (method, token, extraParams) {
  assert(token, 'Token required');
  assert(extraParams, 'Extra params dictionary required');

  var handleResponse = function (res) {
    if (res && res.success !== undefined) {
      return res.success ? res : Promise.reject(res);
    } else {
      return Promise.reject({error: 'TOKEN_ENDPOINT_UNEXPECTED_RESPONSE'});
    }
  };

  var params = {
    token: token,
    method: method
  };

  for (var k in extraParams) {
    params[k] = extraParams[k];
  }

  return API.request('POST', 'wallet', params)
    .then(handleResponse);
}

function verifyEmail (token) {
  return this.postTokenEndpoint('verify-email-token', token, {});
}

function unsubscribe (token) {
  return this.postTokenEndpoint('unsubscribe', token, {});
}

function authorizeApprove (token, differentBrowserCallback, differentBrowserApproved) {
  assert(Helpers.isBoolean(differentBrowserApproved) || differentBrowserApproved == null, 'differentBrowserApproved must be null, false or true');

  var handleError = function (res) {
    if (res.success === null) {
      differentBrowserCallback(res);
      return res;
    } else if (res.success === false && res['request-denied']) {
      return res;
    } else {
      return Promise.reject(res);
    }
  };

  var extraParams = {};
  if (differentBrowserApproved !== null) {
    extraParams.confirm_approval = differentBrowserApproved;
  }

  return this.postTokenEndpoint('authorize-approve', token, extraParams)
    .catch(handleError);
}

function resetTwoFactor (token) {
  return this.postTokenEndpoint('reset-two-factor-token', token, {});
}

module.exports = {
  verifyEmail: verifyEmail,
  unsubscribe: unsubscribe,
  authorizeApprove: authorizeApprove,
  resetTwoFactor: resetTwoFactor,
  postTokenEndpoint: postTokenEndpoint // For tests
};
