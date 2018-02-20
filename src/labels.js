var Helpers = require('./helpers');
var AddressHD = require('./address-hd');
var BlockchainAPI = require('./api');

var assert = require('assert');

class Labels {
  constructor (wallet, syncWallet) {
    assert(syncWallet instanceof Function, 'syncWallet function required');
    this._wallet = wallet;

    this._syncWallet = () => new Promise(syncWallet);

    this.init();
  }

  init () {
    this._accounts = [];

    for (let hdAccount of this._wallet.hdwallet.accounts) {
      let accountIndex = hdAccount.index;
      let receiveIndex = hdAccount.receiveIndex;
      let addresses = [];

      for (let addressLabel of hdAccount.getLabels()) {
        addresses[addressLabel.index] = new AddressHD(
          {
            label: addressLabel.label
          },
          hdAccount,
          addressLabel.index
        );
      }

      // Add null entries up to the current (labeled) receive index
      for (let i = 0; i < Math.max(receiveIndex + 1, addresses.length); i++) {
        if (!addresses[i]) {
          addresses[i] = new AddressHD(null,
                        hdAccount,
                        i);
        }
      }
      this._accounts[accountIndex] = addresses;
    }
  }

  get readOnly () {
    return false;
  }

  // For debugging only, not used to save.
  toJSON () {
    return {
      version: this.version,
      accounts: this._accounts.map((addresses) => {
        if (addresses.length > 1) {
          addresses = Helpers.deepClone(addresses);
          // Remove trailing null values:
          while (!addresses[addresses.length - 1] || addresses[addresses.length - 1].label === null) {
            addresses.pop();
          }
        }
        return addresses;
      })
    };
  }

  // Goes through all labeled addresses and checks which ones have transactions.
  // This result will be cached in the future. Although we obtain the balance,
  // this is an implementation detail and we don't save it.
  checkIfUsed (accountIndex) {
    assert(Helpers.isPositiveInteger(accountIndex), 'specify accountIndex');
    let labeledAddresses = this.all(accountIndex).filter((a) => a !== null && a.label !== null);
    let addresses = labeledAddresses.map((a) => a.address);
    if (addresses.length === 0) return Promise.resolve();

    return BlockchainAPI.getBalances(addresses).then((data) => {
      for (let labeledAddress of labeledAddresses) {
        if (data[labeledAddress.address]) {
          labeledAddress.used = data[labeledAddress.address].n_tx > 0;
        }
      }
    });
  }

  fetchBalance (hdAddresses) {
    assert(Array.isArray(hdAddresses), 'hdAddresses missing');
    for (let addressHD of hdAddresses) {
      assert(addressHD.constructor.name === 'AddressHD', 'AddressHD required');
    }
    let addresses = hdAddresses.filter((a) => a.balance === null)
               .map((a) => a.address);

    if (addresses.length === 0) return Promise.resolve();

    return BlockchainAPI.getBalances(addresses).then((data) => {
      for (let a of hdAddresses) {
        if (data[a.address]) {
          a.used = data[a.address].n_tx > 0;
          a.balance = data[a.address].final_balance;
        }
      }
    });
  }

  all (accountIndex, options = {}) {
    return this._getAccount(accountIndex);
  }

  // Side-effect: adds empty array to this._accounts if needed
  _getAccount (accountIndex) {
    assert(Helpers.isPositiveInteger(accountIndex), 'specify accountIndex');
    if (!this._accounts[accountIndex]) {
      assert(this._wallet.hdwallet.accounts[accountIndex], 'Wallet does not contain account', accountIndex);
      this._accounts[accountIndex] = [];
    }
    return this._accounts[accountIndex];
  }

  // returns Int or null
  maxLabeledReceiveIndex (accountIndex) {
    let labeledAddresses = this._getAccount(accountIndex).filter(a => a && a.label !== null);
    if (labeledAddresses.length === 0) return null;
    let indexOf = labeledAddresses[labeledAddresses.length - 1].index;
    return indexOf > -1 ? indexOf : null;
  }

  // Side-effect: adds a new entry if there is a new account or receive index.
  getAddress (accountIndex, receiveIndex) {
    var entry = this._getAccount(accountIndex)[receiveIndex];

    if (!entry) {
      entry = new AddressHD(null,
                           this._wallet.hdwallet.accounts[accountIndex],
                           receiveIndex);
      entry.used = null;
      this._getAccount(accountIndex)[receiveIndex] = entry;
    }

    return entry;
  }

  getLabel (accountIndex, addressIndex) {
    let entry = this.getAddress(accountIndex, addressIndex);
    return entry.label;
  }

  addLabel (accountIndex, maxGap, label) {
    assert(Helpers.isPositiveInteger(accountIndex), 'specify accountIndex');
    assert(Helpers.isString(label), 'specify label');
    assert(Helpers.isPositiveInteger(maxGap) && maxGap <= 20, 'Max gap must be less than 20');

    let receiveIndex = this._wallet.hdwallet.accounts[accountIndex].receiveIndex;
    let lastUsedReceiveIndex = this._wallet.hdwallet.accounts[accountIndex].lastUsedReceiveIndex;

    if (!Helpers.isValidLabel(label)) {
      return Promise.reject('NOT_ALPHANUMERIC');
    } else if (receiveIndex - lastUsedReceiveIndex >= maxGap) {
      // Exceeds BIP 44 unused address gap limit
      return Promise.reject('GAP');
    }

    let addr = this.getAddress(accountIndex, receiveIndex);

    addr.label = label;
    addr.used = false;

    // Update wallet:
    this._wallet.hdwallet.accounts[accountIndex].addLabel(receiveIndex, label);

    return this._syncWallet().then(() => {
      return addr;
    });
  }

  // address: either an AddressHD object or a receive index Integer
  setLabel (accountIndex, address, label) {
    assert(
      Helpers.isPositiveInteger(address) ||
      (address.constructor && address.constructor.name === 'AddressHD'),
    'address should be AddressHD instance or Int');

    let receiveIndex;

    if (Helpers.isPositiveInteger(address)) {
      receiveIndex = address;
      address = this.getAddress(accountIndex, receiveIndex);
    } else {
      receiveIndex = this._getAccount(accountIndex).indexOf(address);
      assert(Helpers.isPositiveInteger(receiveIndex), 'Address not found');
    }

    if (!Helpers.isValidLabel(label)) {
      return Promise.reject('NOT_ALPHANUMERIC');
    }

    if (address.label === label) {
      return Promise.resolve();
    }

    address.label = label;

    // Update in wallet:
    this._wallet.hdwallet.accounts[accountIndex].setLabel(receiveIndex, label);

    return this._syncWallet();
  }

  removeLabel (accountIndex, address) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');

    assert(
      Helpers.isPositiveInteger(address) ||
      (address.constructor && address.constructor.name === 'AddressHD'),
    'address should be AddressHD instance or Int');

    let addressIndex;
    if (Helpers.isPositiveInteger(address)) {
      addressIndex = address;
      address = this._getAccount(accountIndex)[address];
    } else {
      addressIndex = this._getAccount(accountIndex).indexOf(address);
      assert(Helpers.isPositiveInteger(addressIndex), 'Address not found');
    }

    address.label = null;

    // Remove from wallet:
    this._wallet.hdwallet.accounts[accountIndex].removeLabel(addressIndex);

    return this._syncWallet();
  }

  // options:
  //   Int || null reusableIndex: allow reuse in case of the gap limit
  reserveReceiveAddress (accountIndex, options = {}) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    if (options.reusableIndex !== undefined) {
      assert(
        options.reusableIndex === null ||
        Helpers.isPositiveInteger(options.reusableIndex),
      'not an integer');
    }

    var self = this;
    var account = this._wallet.hdwallet.accounts[accountIndex];

    let receiveIndex = account.receiveIndex;
    var originalLabel; // In case of address reuse

    // Respect the GAP limit:
    if (receiveIndex - account.lastUsedReceiveIndex >= 20) {
      receiveIndex = options.reusableIndex;
      if (receiveIndex == null) throw new Error('gap_limit');
      originalLabel = this.getLabel(accountIndex, receiveIndex);
    }

    var receiveAddress = account.receiveAddressAtIndex(receiveIndex);

    //   String label: will be appended in case of reuse
    function commitAddressLabel (label = '') {
      if (originalLabel) label = `${originalLabel}, ${label}`;

      self.setLabel(accountIndex, receiveIndex, label);
    }

    return {
      receiveIndex: receiveIndex,
      receiveAddress: receiveAddress,
      commit: commitAddressLabel
    };
  }

  releaseReceiveAddress (accountIndex, receiveIndex, options = {}) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    assert(Helpers.isPositiveInteger(receiveIndex), 'Receive index required');

    if (options.expectedLabel !== undefined) {
      assert(
        options.expectedLabel === null ||
        Helpers.isString(options.expectedLabel),
      'not a string');
    }

    let address = this.getAddress(accountIndex, receiveIndex);

    if (options.expectedLabel) {
      if (address.label.includes(options.expectedLabel)) {
        const firstEntry = address.label.indexOf(options.expectedLabel) === 0;
        this.setLabel(
          accountIndex,
          address,
          firstEntry
            ? address.label.replace(options.expectedLabel + ', ', '')
            : address.label.replace(', ' + options.expectedLabel, '')
        );
      } else {
        // Don't touch the label
      }
    } else {
      // Remove label
      this.removeLabel(accountIndex, address);
    }
  }
}

module.exports = Labels;
