var Bitcoin = require('bitcoinjs-lib');
var assert = require('assert');

// In-memory cache for generated keys
var receiveKeyCache = [];
var changeKeyCache = [];

function HDAccount(label, index, network) {
  this.label = label;
  this.index = index;
  this.network = network || Bitcoin.networks.bitcoin;

  this.externalAccount = null;
  this.internalAccount = null;
  this.extendedPrivateKey = null;
  this.extendedPublicKey = null;

  this.receiveIndex = 0;
  this.changeIndex = 0;
  this.n_tx = 0;
  this.numTxFetched = 0;
  this.balance = null;

  this.archived = false;
  this.address_labels= [];

  // Cache for PubKeys and ChainCode to improve init speed
  this.cache= {};
}

HDAccount.fromExtKey = function(extKey, cache, label, index, network) {
  var account = new HDAccount(label, index, network);

  if(cache) {
    account.externalAccount = new Bitcoin.HDNode(cache.externalAccountPubKey, cache.externalAccountChainCode);
    account.internalAccount = new Bitcoin.HDNode(cache.internalAccountPubKey, cache.internalAccountChainCode);
  } else {
    var accountZero = Bitcoin.HDNode.fromBase58(extKey);
    account.externalAccount = accountZero.derive(0);
    account.internalAccount = accountZero.derive(1);
  }

  return account;
};

HDAccount.prototype.setReceiveIndex = function(index) {
  this.receiveIndex = index;
};

HDAccount.prototype.getReceiveIndex = function() {
  return this.receiveIndex;
};

HDAccount.prototype.incrementReceiveIndex = function() {
  this.receiveIndex++;
};

HDAccount.prototype.incrementReceiveIndexIfLastIndex = function(index) {
  if(index == this.getReceiveIndex()) {
    this.incrementReceiveIndex();
  }
};

HDAccount.prototype.incrementReceiveIndexIfCurrentIsLabeled = function() {
  if(this.getLabelForReceiveAddress(this.getReceiveIndex())) {
    this.incrementReceiveIndex();
  }
};

HDAccount.prototype.incrementReceiveIndexIfLastIndexIsIncluded = function(addresses) {
  for (var i in addresses) {
    if(this.getReceiveAddressAtIndex(this.getReceiveIndex()) === addresses[i]) {
      this.incrementReceiveIndex();
    }
  }
};

HDAccount.prototype.getReceiveAddressAtIndex = function(index) {
  assert(typeof(index) === "number"); // Catches e.g. getReceiveAddress(this.getReceiveIndex) 

  if (receiveKeyCache[index]) {
    return receiveKeyCache[index].getAddress().toString();
  }

  var key = this.externalAccount.derive(index);
  receiveKeyCache[index] = key;
  return key.getAddress().toString();
};

HDAccount.prototype.getReceiveAddress = function() {
  return this.getReceiveAddressAtIndex(this.receiveIndex);
};

HDAccount.prototype.getChangeIndex = function() {
  return this.changeIndex;
};

HDAccount.prototype.getChangeAddressAtIndex = function(index) {
  if (changeKeyCache[index]) {
    return changeKeyCache[index].getAddress().toString();
  }

  var key = this.internalAccount.derive(index);
  changeKeyCache[index] = key;
  return key.getAddress().toString();
};

HDAccount.prototype.getChangeAddress = function() {
  return this.getChangeAddressAtIndex(this.changeIndex);
};

HDAccount.prototype.generateKeyFromPath = function(path) {
  var components = path.split("/");

  if (components[0] != 'M') {
    throw 'Invalid Path Prefix';
  }

  if (components.length != 3) {
    throw 'Invalid Path Length';
  }

  var receiveOrChange = parseInt(components[1]);
  var index = parseInt(components[2]);

  var key;

  if (receiveOrChange === 0) {
    // Receive
    if (receiveKeyCache[index]) {
      key = receiveKeyCache[index];
    }
    else {
      key = this.externalAccount.derive(index);
      receiveKeyCache[index] = key;
    }
  } else {
    // Change
    if (changeKeyCache[index]) {
      key = changeKeyCache[index];
    }
    else {
      key = this.internalAccount.derive(index);
      changeKeyCache[index] = key;
    }
  }

  return key;
};

HDAccount.prototype.getPrivateKey = function(index) {
  if (receiveKeyCache[index]) {
    return receiveKeyCache[index].privKey;
  }

  var key = this.externalAccount.derive(index);
  receiveKeyCache[index] = key;
  return key.privKey;
};

HDAccount.prototype.getInternalPrivateKey = function(index) {
  if (changeKeyCache[index]) {
    return changeKeyCache[index].privKey;
  }

  var key = this.internalAccount.derive(index);
  changeKeyCache[index] = key;
  return key.privKey;
};

HDAccount.prototype.getAccountJsonData = function() {
  var accountJsonData = {
    label : this.getLabel(),
    archived : this.isArchived(),
    xpriv : this.extendedPrivateKey,
    xpub : this.extendedPublicKey,
    address_labels: this.address_labels,
    cache: this.cache
  };

  return accountJsonData;
};

HDAccount.prototype.getLabel = function() {
  return this.label;
};

HDAccount.prototype.setLabel = function(label) {
  this.label = label;
};

HDAccount.prototype.getLabelForReceiveAddress = function(addressIndex) {
  for (var i in this.address_labels) {
    var indexLabel = this.address_labels[i];
    if (indexLabel.index == addressIndex) {
      return this.address_labels[i];
      break;
    }
  }
};

HDAccount.prototype.setLabelForAddress = function(addressIndex, label) {
  for (var i in this.address_labels) {
    var indexLabel = this.address_labels[i];
    if (indexLabel.index == addressIndex) {
      this.address_labels.splice(i, 1);
      break;
    }
  }

  this.address_labels.push({'index': addressIndex, 'label': label});
};

HDAccount.prototype.unsetLabelForAddress = function(addressIndex) {
  for (var i in this.address_labels) {
    var indexLabel = this.address_labels[i];
    if (indexLabel.index == addressIndex) {
      this.address_labels.splice(i, 1);
      return true;
    }
  }
  return false;
};

HDAccount.prototype.getLabeledReceivingAddresses = function() {
  return this.address_labels;
};

HDAccount.prototype.isArchived = function() {
  return this.archived;
};

HDAccount.prototype.setIsArchived = function(archived) {
  this.archived = archived;
};

HDAccount.prototype.getExtendedPublicKey = function(isPrivate) {
  return this.extendedPublicKey;
};

HDAccount.prototype.getExtendedPrivateKey = function(isPrivate) {
  return this.extendedPrivateKey;

};

HDAccount.prototype.generateCache = function() {
  assert(this.externalAccount, "External Account not set");
  assert(this.internalAccount, "Internal Account not set");

  this.cache.externalAccountPubKey = this.externalAccount.pubKey.toBuffer().toString("base64");
  this.cache.externalAccountChainCode = this.externalAccount.chainCode.toString("base64");
  this.cache.internalAccountPubKey = this.internalAccount.pubKey.toBuffer().toString("base64");
  this.cache.internalAccountChainCode = this.internalAccount.chainCode.toString("base64");
};

HDAccount.prototype.getBalance = function() {
  return this.balance;
};

HDAccount.prototype.setBalance = function(balance) {
  return this.balance = balance;
};

HDAccount.prototype.recommendedTransactionFee = function(amount) {
  // TODO To get the correct value depending on amount and inputs, we have to call getUnspentOutputs (server call) and create a fake transaction
  return this.network.feePerKb;
};

module.exports = HDAccount;
