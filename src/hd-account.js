var crypto = require('crypto');
var Bitcoin = require('bitcoinjs-lib');
var assert = require('assert');

var HDAccount = function(seed, network, label, idx) {

  network = network || Bitcoin.networks.bitcoin;

  var self = this;

  this.label = label;
  this.idx = idx;
  this.extendedPrivateKey = null;
  this.extendedPublicKey = null;
  this.receiveIndex = 0;
  this.changeIndex = 0;
  this.n_tx = 0;
  this.numTxFetched = 0;
  this.archived = false;
  this.address_labels= [];
  this.balance = null;
  this.cache= {};

  // Stored in a closure to make accidental serialization less likely
  var masterkey = null;
  this.internalAccount = null;
  this.externalAccount = null;

  // Transaction output data
  this.outputs = {};

  // In-memory cache for generated keys
  var receiveKeyCache = [];
  var changeKeyCache = [];

  if (seed) {
    seed = seed || crypto.randomBytes(32);
    masterkey = Bitcoin.HDNode.fromSeedBuffer(seed, network);

    // HD first-level child derivation method should be hardened
    // See https://bitcointalk.org/index.php?topic=405179.msg4415254#msg4415254
    var accountZero = masterkey.deriveHardened(0);
    this.externalAccount = accountZero.derive(0);
    this.internalAccount = accountZero.derive(1);

    receiveKeyCache = [];
    changeKeyCache = [];

    self.outputs = {};
  };

  // Make a new master key
  this.newNodeFromExtKey = function(extKey, cache) {
    if(cache == undefined) {
      var accountZero = Bitcoin.HDNode.fromBase58(extKey);
      this.externalAccount = accountZero.derive(0);
      this.internalAccount = accountZero.derive(1);
    } else {
      this.externalAccount = new Bitcoin.HDNode(cache.externalAccountPubKey, cache.externalAccountChainCode);
      this.internalAccount = new Bitcoin.HDNode(cache.internalAccountPubKey, cache.internalAccountChainCode);
    }

    receiveKeyCache = [];
    changeKeyCache = [];

    self.outputs = {};
  };
  
  this.setReceiveIndex = function(idx) {
    this.receiveIndex = idx;
  };

  this.getReceiveIndex = function() {
    return this.receiveIndex;
  };
  
  this.incrementReceiveIndex = function() {
    this.receiveIndex++;
  }
  
  this.incrementReceiveIndexIfLastIndex = function(idx) {
    if(idx == this.getReceiveIndex()) {
      this.incrementReceiveIndex();
    }
  }
  
  this.incrementReceiveIndexIfCurrentIsLabeled = function() {
    if(this.getLabelForReceiveAddress(this.getReceiveIndex())) {
      this.incrementReceiveIndex();
    }
  }
  
  this.incrementReceiveIndexIfLastIndexIsIncluded = function(addresses) {
    for (i in addresses) {
      if(this.getReceiveAddressAtIndex(this.getReceiveIndex()) === addresses[i]) {
        this.incrementReceiveIndex();
      }
    }
  }

  this.getReceiveAddressAtIndex = function(idx) {
    assert(typeof(idx) === "number"); // Catches e.g. getReceiveAddress(this.getReceiveIndex) 
    
    if (receiveKeyCache[idx]) {
      return receiveKeyCache[idx].getAddress().toString();
    }

    var key = this.externalAccount.derive(idx);
    receiveKeyCache[idx] = key;
    return key.getAddress().toString();
  };

  this.getReceiveAddress = function() {
    return this.getReceiveAddressAtIndex(this.receiveIndex);
  };

  this.getChangeIndex = function() {
    return this.changeIndex;
  };

  this.getChangeAddressAtIndex = function(idx) {
    if (changeKeyCache[idx]) {
      return changeKeyCache[idx].getAddress().toString();
    }

    var key = this.internalAccount.derive(idx);
    changeKeyCache[idx] = key;
    return key.getAddress().toString();
  };

  this.getChangeAddress = function() {
    return self.getChangeAddressAtIndex(self.changeIndex);
  };

  this.generateKeyFromPath = function(path) {
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

  this.getMasterKey = function() {
    return masterkey;
  };

  this.getPrivateKey = function(index) {
    if (receiveKeyCache[index]) {
      return receiveKeyCache[index].privKey;
    }

    var key = this.externalAccount.derive(index);
    receiveKeyCache[index] = key;
    return key.privKey;
  };

  this.getInternalPrivateKey = function(index) {
    if (changeKeyCache[index]) {
      return changeKeyCache[index].privKey;
    }

    var key = this.internalAccount.derive(index);
    changeKeyCache[index] = key;
    return key.privKey;
  };

  this.getAccountJsonData = function() {
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

  this.getLabel = function() {
    return this.label;
  };

  this.setLabel = function(label) {
    this.label = label;
  };
    
  this.getLabelForReceiveAddress = function(addressIdx) {
    for (var i in this.address_labels) {
      var indexLabel = this.address_labels[i];
      if (indexLabel.index == addressIdx) {
        return this.address_labels[i];
        break;
      }
    }
  };

  this.setLabelForAddress = function(addressIdx, label) {
    for (var i in this.address_labels) {
      var indexLabel = this.address_labels[i];
      if (indexLabel.index == addressIdx) {
        this.address_labels.splice(i, 1);
        break;
      }
    }

    this.address_labels.push({'index': addressIdx, 'label': label});
  };

  this.unsetLabelForAddress = function(addressIdx) {
    for (var i in this.address_labels) {
      var indexLabel = this.address_labels[i];
      if (indexLabel.index == addressIdx) {
        this.address_labels.splice(i, 1);
        return true;
      }
    }
    return false;
  };
  
  this.getLabeledReceivingAddresses = function() {
    return this.address_labels;
  }

  this.isArchived = function() {
    return this.archived;
  };

  this.setIsArchived = function(archived) {
    this.archived = archived;
  };

  this.getExtendedPublicKey = function(isPrivate) {
    return this.extendedPublicKey;
  };

  this.getExtendedPrivateKey = function(isPrivate) {
    return this.extendedPrivateKey;

  };

  this.generateCache = function() {
    this.cache.externalAccountPubKey = this.externalAccount.pubKey.toBuffer().toString("base64");
    this.cache.externalAccountChainCode = this.externalAccount.chainCode.toString("base64");
    this.cache.internalAccountPubKey = this.internalAccount.pubKey.toBuffer().toString("base64");
    this.cache.internalAccountChainCode = this.internalAccount.chainCode.toString("base64");
  };

  this.getBalance = function() {
    return this.balance;
  };

  this.setBalance = function(balance) {
    return this.balance = balance;
  };

  this.recommendedTransactionFee = function(amount) {
    // TODO To get the correct value depending on amount and inputs, we have to call getUnspentOutputs (server call) and create a fake transaction
    return Bitcoin.networks.bitcoin.feePerKb;
  };

};

module.exports = HDAccount;
