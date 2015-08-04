'use strict';

var assert = require('assert');

var MyWallet = require('./wallet.js');

var endpoint = "https://alpha.blockchain.com:8081/";

function setEndpoint(value) {
  endpoint = value;
}

module.exports = {
  setEndpoint : setEndpoint
};
