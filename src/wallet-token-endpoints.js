'use strict';

var assert = require('assert');

var API = require('./api');

function verifyEmail(token, successCallback, errorCallback) {
  var success = function(res) {
    if(res && res.success != undefined) {
      if(res.success) {
        successCallback(res.guid);
      } else {
        errorCallback(res.error);
      }
    } else {
      errorCallback("VERIFY_EMAIL_ENDPOINT_UNEXPECTED_RESPONSE");
    }
  }

  var error = function (err) {
    errorCallback(err);
  }

  var myData = { token: token,  method : 'verify-email-token', api_code : API.API_CODE};
  API.request("POST", 'wallet', myData, false).then(success).catch(error);
}

function unsubscribe(token, successCallback, errorCallback) {
  var success = function (res) {
    if(res && res.success != undefined) {
      if(res.success) {
        successCallback(res.guid);
      } else {
        errorCallback(res.error);
      }
    } else {
      errorCallback("UNSUBSCRIBE_ENDPOINT_UNEXPECTED_RESPONSE");
    }
  }

  var error = function (err) {
    errorCallback(err);
  }

  var myData = { token: token,  method : 'unsubscribe', api_code : API.API_CODE};
  API.request("POST", 'wallet', myData, false).then(success).catch(error);
}

function authorizeApprove(token, successCallback, errorCallback) {
  var success = function (res) {
    if(res && res.success != undefined) {
      if(res.success) {
        successCallback(res.guid);
      } else {
        errorCallback(res.error);
      }
    } else {
      errorCallback("AUTHORIZED_APPROVE_ENDPOINT_UNEXPECTED_RESPONSE");
    }
  }

  var error = function (err) {
    errorCallback(err);
  }

  var myData = { token: token,  method : 'authorize-approve', api_code : API.API_CODE};
  API.request("POST", 'wallet', myData, false).then(success).catch(error);
}


module.exports = {
  verifyEmail: verifyEmail,
  unsubscribe: unsubscribe,
  authorizeApprove: authorizeApprove
};
