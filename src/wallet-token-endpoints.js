'use strict';

var assert = require('assert');

var API = require('./api');

function verifyEmail(token, success, error) {
  var myData = { token: token,  method : 'verify-email-token', api_code : API.API_CODE};
  API.request("POST", 'wallet', myData, false).then(success).catch(error);
}

module.exports = {
  verifyEmail: verifyEmail
};
