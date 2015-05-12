'use strict';

module.exports = Wallet;

////////////////////////////////////////////////////////////////////////////////
// dependencies

var assert = require('assert');
var xregexp = require('xregexp');
var Bitcoin = require('bitcoinjs-lib');
var ECKey = Bitcoin.ECKey;
var BigInteger = require('bigi');
var Buffer = require('buffer').Buffer;
var Base58 = require('bs58');
var BIP39 = require('bip39');

var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var WalletSignup = require('./wallet-signup');
var ImportExport = require('./import-export');
var HDWallet = require('./hd-wallet');
var HDAccount = require('./hd-account');
var Transaction = require('./transaction');
var BlockchainAPI = require('./blockchain-api');

////////////////////////////////////////////////////////////////////////////////
// constructor

function Wallet(foo, bar) {
  this.a = foo;
}

Wallet.fromJSON = function (json) {
    console.log("I am the fromJSON constructor");
    // create a new wallet and return it
};

Wallet.prototype.print = function() {
  console.log(this.a);
};
