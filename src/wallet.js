'use strict';

var MyWallet = module.exports = {};

var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var ECPair = Bitcoin.ECPair;
var BigInteger = require('bigi');
var Buffer = require('buffer').Buffer;
var Base58 = require('bs58');
var BIP39 = require('bip39');

var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var WalletSignup = require('./wallet-signup');
var API = require('./api');
var Wallet = require('./blockchain-wallet');
var Helpers = require('./helpers');
var shared = require('./shared');
var BlockchainSocket = require('./blockchain-socket');

var isInitialized = false;
MyWallet.wallet = undefined;
MyWallet.ws = new BlockchainSocket();

// used on MyWallet
MyWallet.securePost = function(url, data, success, error) {
  API.securePost(url, data).then(success).catch(error);
};

// used only locally: wallet.js : checkAllKeys (see what happens with this sanity check)
MyWallet.B58LegacyDecode = function(input) {
  var alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  var base = BigInteger.valueOf(58);

  var bi = BigInteger.valueOf(0);
  var leadingZerosNum = 0;
  for (var i = input.length - 1; i >= 0; i--) {
    var alphaIndex = alphabet.indexOf(input[i]);

    bi = bi.add(BigInteger.valueOf(alphaIndex)
                .multiply(base.pow(input.length - 1 -i)));

    // This counts leading zero bytes
    if (input[i] == "1") leadingZerosNum++;
    else leadingZerosNum = 0;
  }
  var bytes = bi.toByteArrayUnsigned();

  // Add leading zeros
  while (leadingZerosNum-- > 0) bytes.unshift(0);

  return bytes;
};

// Temporary workaround instead instead of modding bitcoinjs to do it TODO: not efficient
// used only on wallet.js and wallet-store.js
MyWallet.getCompressedAddressString = function(key) {
  return new ECPair(key.d, null, {compressed: true}).getAddress().toString();
};
// used only on wallet.js
MyWallet.getUnCompressedAddressString = function(key) {
  return new ECPair(key.d, null, {compressed: false}).getAddress().toString();
};

////////////////////////////////////////////////////////////////////////////////
// TODO :: WALLET SPENDER FIX
// only used on the Spender (for paytoEmail/Mobile, need a fix)
MyWallet.addPrivateKey = function(key, opts, second_password) {
  var sharedKey = MyWallet.wallet.sharedKey;
  var pbkdf2_iterations = MyWallet.wallet.pbkdf2_iterations;

  if (WalletStore.walletIsFull()) {
    throw 'Wallet is full.';
  }
  if (key == null) {
    throw 'Cannot add null key.';
  }
  if (opts == null)
    opts = {compressed: true};

  var addr = opts.compressed ? MyWallet.getCompressedAddressString(key) : MyWallet.getUnCompressedAddressString(key);
  var base58 = Base58.encode(key.d.toBuffer(32));
  var encoded = base58 == null || second_password == null ? base58 : WalletCrypto.encryptSecretWithSecondPassword(base58, second_password, sharedKey, pbkdf2_iterations);
  if (encoded == null) {
    throw 'Error Encoding key';
  }
  var decoded_base_58 = second_password == null ? base58 : WalletCrypto.decryptSecretWithSecondPassword(encoded, second_password, sharedKey, pbkdf2_iterations);
  var decoded_key = new ECPair(new BigInteger.fromBuffer(decoded_base_58), null, opts);
  if (addr != MyWallet.getUnCompressedAddressString(key) && addr != MyWallet.getCompressedAddressString(key)) {
    throw 'Decoded Key address does not match generated address';
  }
  if (addr != MyWallet.getUnCompressedAddressString(key) && addr != MyWallet.getCompressedAddressString(key)) {
    throw 'Decoded Key address does not match generated address';
  }

  //TODO: Move this once opts and probably all addPrivateKey func to walletstore
  var addresses = WalletStore.getAddresses();
  if (WalletStore.addLegacyAddress(addr, encoded)) {
    addresses[addr].tag = 1; //Mark as unsynced
    addresses[addr].created_time = opts.created_time ? opts.created_time : 0; //Stamp With Creation time
    addresses[addr].created_device_name = opts.app_name ? opts.app_name : shared.APP_NAME; //Created Device
    addresses[addr].created_device_version = opts.app_version ? opts.app_version : shared.APP_VERSION; //Created App Version

    if (addresses[addr].priv != encoded)
      throw 'Address priv does not match encoded';

    //Subscribe to transaction updates through websockets
    try {
      MyWallet.ws.send('{"op":"addr_sub", "addr":"'+addr+'"}');
    } catch (e) { }
  } else {
    throw 'Could not add key. This key already exists in your wallet.';
  }
  return addr;
};

// used on sharedcoin.js, wallet-spender.js and wallet.js
MyWallet.generateNewKey = function(_password) {
  var key = Bitcoin.ECPair.makeRandom({compressed: true});

  // key is uncompressed, so cannot passed in opts.compressed = true here
  if (MyWallet.addPrivateKey(key)) {
    return key;
  }
};
// used on wallet-spender.js and wallet.js
MyWallet.generateNewMiniPrivateKey = function() {
  // Documentation: https://en.bitcoin.it/wiki/Mini_private_key_format
  while (true) {
    //Use a normal ECPair to generate random bytes
    var key = Bitcoin.ECPair.makeRandom({compressed: false});

    //Make Candidate Mini Key
    var minikey = 'S' + Base58.encode(key.d.toBuffer(32)).substr(0, 21);

    //Append ? & hash it again
    var bytes_appended = Bitcoin.crypto.sha256(minikey + '?');

    //If zero byte then the key is valid
    if (bytes_appended[0] == 0) {

      //SHA256
      var bytes = Bitcoin.crypto.sha256(minikey);

      var ecpair = new Bitcoin.ECPair(new BigInteger.fromBuffer(bytes), null, {compressed: false});

      if (MyWallet.addPrivateKey(ecpair, {compressed: true}))
        return {key : ecpair, miniKey : minikey};
    }
  }
};
// TODO :: END WALLET SPENDER FIX
////////////////////////////////////////////////////////////////////////////////

// used locally
function socketConnect() {
  MyWallet.ws.connect(onOpen, onMessage, onClose);

  var last_on_change = null;

  function onMessage(message) {
    var obj = null;

    if (!(typeof window === 'undefined')) {
      message = message.data;
    }
    try {
      obj = JSON.parse(message);
    }
    catch (e) {
      console.log('Websocket error: could not parse message data as JSON: ' + message);
      return;
    }

    var transactions = WalletStore.getTransactions();

    if (obj.op == 'on_change') {
      var old_checksum = WalletStore.generatePayloadChecksum();
      var new_checksum = obj.checksum;

      if (last_on_change != new_checksum && old_checksum != new_checksum) {
        last_on_change = new_checksum;

        MyWallet.getWallet();
      }

    } else if (obj.op == 'utx') {
      var tx = shared.TransactionFromJSON(obj.x);
      var tx_processed = MyWallet.processTransaction(tx);
      var tx_account = tx_processed.to.accounts[0];

      // Adds raw tx to txList, processing done by txList
      MyWallet.wallet.txList.shiftTxs(obj.x);

      //Check if this is a duplicate
      //Maybe should have a map_prev to check for possible double spends
      for (var key in transactions) {
        if (transactions[key].txIndex == tx.txIndex) return;
      }

      MyWallet.wallet.finalBalance += tx_processed.result;
      MyWallet.wallet.getHistory();

      if (tx_account) {
        var account = MyWallet.wallet.hdwallet.accounts[tx_account.index];
        account.balance += tx_processed.result;

        // Increase receive address index if this was an incoming transaction using the highest index:
        if((tx_processed.result > 0 || tx_processed.intraWallet)) {
          var addresses = [];
          for(i in tx.out) {
            addresses.push(tx.out[i].addr);
          }
          if (addresses.some(function(a){return a === account.receiveAddress})){
            account.incrementReceiveIndex();
          }
        }
      }

      MyWallet.wallet.numberTxTotal   += 1;
      MyWallet.wallet.numberTxFetched += 1;
      tx.setConfirmations(0);
      WalletStore.pushTransaction(tx);
      shared.playSound('beep');
      WalletStore.sendEvent('on_tx');

    }  else if (obj.op == 'block') {
      //Check any transactions included in this block, if the match one our ours then set the block index
      for (var i = 0; i < obj.x.txIndexes.length; ++i) {
        for (var ii = 0; ii < transactions.length; ++ii) {
          if (transactions[ii].txIndex == obj.x.txIndexes[i]) {
            if (transactions[ii].blockHeight == null || transactions[ii].blockHeight == 0) {
              transactions[ii].blockHeight = obj.x.height;
              break;
            }
          }
        }
      }
      WalletStore.setLatestBlock(shared.BlockFromJSON(obj.x));
      WalletStore.sendEvent('on_block');
    }
  }

  function onOpen() {
    WalletStore.sendEvent('ws_on_open');

    var msg = '{"op":"blocks_sub"}';

    if (MyWallet.wallet.guid != null)
      msg += '{"op":"wallet_sub","guid":"'+MyWallet.wallet.guid+'"}';

    try {
      MyWallet.wallet.activeAddresses.forEach(
        function(address) { msg += '{"op":"addr_sub", "addr":"'+ address +'"}'; }
      );

      if (MyWallet.wallet.isUpgradedToHD)
        MyWallet.listenToHDWalletAccounts();

    } catch (e) {
      WalletStore.sendEvent("msg", {type: "error", message: 'error with websocket'});
    }

    MyWallet.ws.send(msg);
  }

  function onClose() {
    WalletStore.sendEvent('ws_on_close');
  }
}

// used in walletstore and locally wallet.js
MyWallet.processTransaction = function(tx) {

  var transaction = {
    from: {account: null, legacyAddresses: null, externalAddresses: null},
    to: {accounts: [], legacyAddresses: null, externalAddresses: null, email: null, mobile: null},
    fee: 0,
    intraWallet: null
  };


  var legacyAddressWithLargestOutput = undefined;
  var externalAddressWithLargestOutput = undefined;
  var amountFromLegacyAddresses = 0;
  var amountFromExternalAddresses = 0;
  var legacyAddressWithLargestOutputAmount = 0;
  var externalAddressWithLargestOutputAmount = 0;
  var fromAccountIndex = undefined;
  var amountFromAccount = 0;

  for (var i = 0; i < tx.inputs.length; ++i) {
    var isOrigin = false;
    var output = tx.inputs[i].prev_out;
    if (!output || !output.addr)
      continue;
    if (MyWallet.wallet.activeKey(output.addr)) {
      isOrigin = true;
      if (transaction.from.legacyAddresses == null)
        transaction.from.legacyAddresses = [];
      transaction.from.legacyAddresses.push({address: output.addr, amount: output.value});
      transaction.fee += output.value;
    } else {
      if (MyWallet.wallet.isUpgradedToHD) {
        for (var j in MyWallet.wallet.hdwallet.accounts) {
          var account = MyWallet.wallet.hdwallet.accounts[j];
          if (account.active && output.xpub != null && account.extendedPublicKey === output.xpub.m) {
            amountFromAccount += output.value;

            if (! isOrigin) {
              isOrigin = true;
              fromAccountIndex = parseInt(j);

              transaction.fee += output.value;
            } else {
              if ( output.value > legacyAddressWithLargestOutputAmount ) {
                legacyAddressWithLargestOutput = output.addr;
                legacyAddressWithLargestOutputAmount = output.value;
              }
              amountFromLegacyAddresses += output.value;
              transaction.fee += output.value;
            }
            break;
          }
        }
      }

      if (! isOrigin) {
        if ( output.value > externalAddressWithLargestOutputAmount ) {
          externalAddressWithLargestOutput = output.addr;
          externalAddressWithLargestOutputAmount = output.value;
        }
        amountFromExternalAddresses += output.value;
        transaction.fee += output.value;
        transaction.intraWallet = false;
      }
    }

    if(transaction.intraWallet == null) {
      transaction.intraWallet = true;
    }
  }

  if(amountFromExternalAddresses > 0) {
    transaction.from.externalAddresses = {addressWithLargestOutput: externalAddressWithLargestOutput, amount: amountFromExternalAddresses};
  }

  if(amountFromLegacyAddresses > 0) {
    transaction.from.legacyAddresses = {addressWithLargestOutput: legacyAddressWithLargestOutput, amount: amountFromLegacyAddresses};
  }

  if(amountFromAccount > 0) {
    transaction.from.account = {index: fromAccountIndex, amount: amountFromAccount};

  }

  for (var i = 0; i < tx.out.length; ++i) {
    var output = tx.out[i];
    if (!output || !output.addr)
      continue;

    if (MyWallet.wallet.activeKey(output.addr)) {
      if (transaction.to.legacyAddresses == null)
        transaction.to.legacyAddresses = [];

      var isFromLegacyAddresses = false;
      for (var j in transaction.from.legacyAddresses) {
        var addressAmount = transaction.from.legacyAddresses[j];
        if (addressAmount.address == output.addr) {
          addressAmount.amount -= output.value;
          isFromLegacyAddresses = true;
        }
      }
      if (! isFromLegacyAddresses) {
        transaction.to.legacyAddresses.push({address: output.addr, amount: output.value});
      }
      transaction.fee -= output.value;
    } else if (MyWallet.wallet.getPaidTo(tx.hash) && MyWallet.wallet.getPaidTo(tx.hash).address == output.addr) {
      var paidToItem = MyWallet.wallet.getPaidTo(tx.hash);
      if(paidToItem.email) {
        transaction.to.email = { email: paidToItem.email, redeemedAt: paidToItem.redeemedAt };
      } else if (paidToItem.mobile) {
        transaction.to.mobile = { number: paidToItem.mobile, redeemedAt: paidToItem.redeemedAt };
      }
      transaction.intraWallet = false;
    }else {
      var toAccountSet = false;
      if (MyWallet.wallet.isUpgradedToHD) {
        for (var j in MyWallet.wallet.hdwallet.accounts) {
          var account = MyWallet.wallet.hdwallet.accounts[j];
          if (account.active && output.xpub != null && account.extendedPublicKey == output.xpub.m) {
            if (! toAccountSet) {
              if (transaction.from.account != null && transaction.from.account.index == parseInt(j)) {
                transaction.from.account.amount -= output.value;
              } else {
                transaction.to.accounts.push({index: parseInt(j), amount: output.value});
              }
              toAccountSet = true;
              transaction.fee -= output.value;
            } else {
              if (transaction.from.account != null && transaction.from.account.index == parseInt(j)) {
                transaction.from.account.amount -= output.value;
              } else if ((transaction.from.account != null || transaction.from.legacyAddresses != null)) {
                  if (transaction.to.externalAddresses == null)
                      transaction.to.externalAddresses = [];
                  transaction.to.externalAddresses.push({address: output.addr, amount: output.value});
              }
              transaction.fee -= output.value;
            }
            break;
          }
        }
      }
      if (! toAccountSet) {
        if ((transaction.from.account != null || transaction.from.legacyAddresses != null)) {
          if (transaction.to.externalAddresses == null)
              transaction.to.externalAddresses = [];
          transaction.to.externalAddresses.push({address: output.addr, amount: output.value});
        }
        transaction.fee -= output.value;
        transaction.intraWallet = false;
      }
    }
  }


  if (transaction.to.accounts.length == 0 &&
      (transaction.to.legacyAddresses == null || transaction.to.legacyAddresses.length === 0) &&
      transaction.to.externalAddresses == null &&
      MyWallet.wallet.activeKey(output.addr)) {
    var output = tx.out[0];
    transaction.to.legacyAddresses.push({address: output.addr, amount: output.value});
  }

  if (transaction.from.account == null && transaction.from.legacyAddresses == null && transaction.from.externalAddresses != null) {
    var fromAmount = 0;
    for (var i in transaction.to.accounts) {
      fromAmount += transaction.to.accounts[i].amount;
    }
    for (var i in transaction.to.legacyAddresses) {
      var addressAmount = transaction.to.legacyAddresses[i];
      fromAmount += addressAmount.amount;
    }
    transaction.from.externalAddresses.amount = fromAmount;
  }

  transaction.hash = tx.hash;

  /* Typically processTransaction() is called directly after transactions
   have been downloaded from the server. In that case you could simply
   reuse tx.confirmations. However processTransaction() can also be
   called at a later time, e.g. if the user keeps their wallet open
   while waiting for a confirmation. */
  transaction.confirmations = MyWallet.getConfirmationsForTx(WalletStore.getLatestBlock(), tx);

  transaction.txTime = tx.time;
  transaction.publicNote = tx.note || null;
  transaction.note = MyWallet.wallet.getNote(tx.hash);
  // TODO: review tags
  // transaction.tags = WalletStore.getTags(tx.hash);
  transaction.size = tx.size;
  transaction.tx_index = tx.txIndex;
  transaction.block_height = tx.blockHeight;

  transaction.result = MyWallet.calculateTransactionResult(transaction);

  // Check if fee is frugal (incomplete):
  transaction.frugal = transaction.fee < 10000

  transaction.double_spend = tx.double_spend == null ? false : tx.double_spend

  return transaction;
};
// used once on this file
MyWallet.calculateTransactionResult = function(transaction) {

  var totalOurs = function(toOrFrom) {
    var result = 0;

    if(toOrFrom.account || (toOrFrom.accounts && toOrFrom.accounts.length > 0)) {
      if(toOrFrom.account) {
        result = toOrFrom.account.amount;
      } else if (toOrFrom.accounts) {
        for(var i in toOrFrom.accounts) {
          result += toOrFrom.accounts[i].amount;
        }
      }
    } else if (toOrFrom.legacyAddresses && toOrFrom.legacyAddresses.length > 0) {
      for(var i in toOrFrom.legacyAddresses) {
        var legacyAddress = toOrFrom.legacyAddresses[i];
        result += legacyAddress.amount;
      }
    }

    return result;
  };

  var result = 0;

  if (transaction.intraWallet) {
    result = totalOurs(transaction.to);
  } else {
    result = totalOurs(transaction.to) - totalOurs(transaction.from);
  }

  return result;
};

// used on wallet-spender and locally
MyWallet.getBaseFee = function() {
  var network = Bitcoin.networks.bitcoin;
  return network.feePerKb;
};

/**
 * @param {function(Array)} successCallback success callback function with transaction array
 * @param {function()} errorCallback error callback function
 * @param {function()} didFetchOldestTransaction callback is called when all transanctions for the specified account has been fetched
 */
 // used only on the frontend

MyWallet.fetchMoreTransactionsForAll = function(success, error, didFetchOldestTransaction) {

  console.log("deprecated use of MyWallet.fetchMoreTransactionsForAll --> Wallet.prototype.fetchMoreTransactions");
  var p = MyWallet.wallet.fetchMoreTransactions(didFetchOldestTransaction);
  if (success) { p.then(success);};
  if (error)   { p.catch(error); };
};

/**
 * @param {function(Array)} successCallback success callback function with transaction array
 * @param {function()} errorCallback error callback function
 * @param {function()} didFetchOldestTransaction callback is called when all transanctions for the specified account has been fetched
 */
 // used only on the frontend

MyWallet.fetchMoreTransactionsForAccounts = function(success, error, didFetchOldestTransaction) {
  console.log("MyWallet.fetchMoreTransactionsForAccounts");
  MyWallet.fetchMoreTransactionsForAll(success, error, didFetchOldestTransaction);
};

/**
 * @param {number} accountIdx idx of account
 * @param {function(Array)} successCallback success callback function with transaction array
 * @param {function()} errorCallback error callback function
 * @param {function()} didFetchOldestTransaction callback is called when all transanctions for the specified account has been fetched
 */
 // used once locally and in the frontend
MyWallet.fetchMoreTransactionsForAccount = function(accountIdx, success, error, didFetchOldestTransaction) {
  console.log("deprecated use of MyWallet.fetchMoreTransactionsForAccount ");
  MyWallet.fetchMoreTransactionsForAll(success, error, didFetchOldestTransaction);
};

/**
 * @param {string} privatekey private key to redeem
 * @param {function()} successCallback success callback function with balance in satoshis
 * @param {function()} errorCallback error callback function
 */
 // used only on the frontend
MyWallet.getBalanceForRedeemCode = function(privatekey, successCallback, errorCallback)  {
  var format = MyWallet.detectPrivateKeyFormat(privatekey);
  if(format == null) {
    errorCallback("Unkown private key format");
    return;
  }
  var privateKeyToSweep = MyWallet.privateKeyStringToKey(privatekey, format);
  var from_address_compressed = MyWallet.getCompressedAddressString(privateKeyToSweep);
  var from_address_uncompressed = MyWallet.getUnCompressedAddressString(privateKeyToSweep);

  function totalBalance (data) {
    return Object.keys(data)
                 .map(function(a){ return data[a].final_balance;})
                 .reduce(Helpers.add, 0);
  }

  API.getBalances([from_address_compressed, from_address_uncompressed])
    .then(totalBalance)
    .then(successCallback)
    .catch(errorCallback);
};

/**
 * @param {function():Array} successCallback success callback function with transaction array
 * @param {function()} errorCallback callback function
 * @param {function()} didFetchOldestTransaction callback is called when all transanctions for legacy addresses have been fetched
 */
 // used on the frontend
MyWallet.fetchMoreTransactionsForLegacyAddresses = function(success, error, didFetchOldestTransaction) {
  console.log("deprecated use of MyWallet.fetchMoreTransactionsForLegacyAddresses");
  MyWallet.fetchMoreTransactionsForAll(success, error, didFetchOldestTransaction);
};

/**
 * @param {string} mnemonic mnemonic
 * @return {boolean} is valid mnemonic
 */
 // should be moved to helpers
MyWallet.isValidateBIP39Mnemonic = function(mnemonic) {
  return BIP39.validateMnemonic(mnemonic);
};

// used only locally (wallet.js)
MyWallet.listenToHDWalletAccount = function(accountExtendedPublicKey) {
  try {
    var msg = '{"op":"xpub_sub", "xpub":"'+ accountExtendedPublicKey +'"}';
    MyWallet.ws.send(msg);
  } catch (e) { }
};
// used only once locally
MyWallet.listenToHDWalletAccounts = function() {
  if (Blockchain.MyWallet.wallet.isUpgradedToHD) {
    var listen = function(a) { MyWallet.listenToHDWalletAccount(a.extendedPublicKey); }
    MyWallet.wallet.hdwallet.activeAccounts.forEach(listen);
  };
};


/**
 * @param {string} candidate candidate address
 * @return {boolean} is valid address
 */
 // TODO: This should be a helper
 // used on wallet-store, frontend and iOS,
MyWallet.isValidAddress = function(candidate) {
  return Helpers.isBitcoinAddress(candidate);
};

/**
 * @param {string} candidate candidate PrivateKey
 * @return {boolean} is valid PrivateKey
 */
 // used on the frontend
 // TODO: this should be a helper
MyWallet.isValidPrivateKey = function(candidate) {
  try {
    var format = MyWallet.detectPrivateKeyFormat(candidate);
    if(format == "bip38") { return true }
    var key = MyWallet.privateKeyStringToKey(candidate, format);
    return key.getAddress().toString();
  } catch (e) {
    return false;
  }
};

// used on myWallet and iOS
MyWallet.get_history = function(success, error) {
  console.log("deprecated use of MyWallet.get_history()!!");
  var p = MyWallet.wallet.getHistory();
  if (success) { p.then(success);};
  if (error) {p.catch(error);};
};
// used on wallet-store and locally (wallet.js)
MyWallet.getConfirmationsForTx = function(latest_block, tx) {
  if (latest_block && tx.blockHeight != null && tx.blockHeight > 0) {
    return latest_block.height - tx.blockHeight + 1;
  } else {
    tx.setConfirmations(0);
    return 0;
  }
};

// used two times
function didDecryptWallet(success) {

  //We need to check if the wallet has changed
  MyWallet.getWallet();
  WalletStore.resetLogoutTimeout();
  success();
}

/**
 * Get the list of transactions from the http API.
 * Needs to be called by client in the success callback of fetchWalletJson and after MyWallet.initializeHDWallet
 * @param {function()=} success Success callback function.
 */
 // used in the frontend and iOS
MyWallet.getHistoryAndParseMultiAddressJSON = function(success, error) {
  console.log("deprecated use of getHistoryAndParseMultiAddressJSON");
  var p = MyWallet.wallet.getHistory();
  if (success) { p.then(success);};
  if (error) { p.catch(error);};
};

// used once
function checkWalletChecksum(payload_checksum, success, error) {
  var data = {method : 'wallet.aes.json', format : 'json', checksum : payload_checksum};

  MyWallet.securePost("wallet", data, function(obj) {
    if (!obj.payload || obj.payload == 'Not modified') {
      if (success) success();
    } else if (error) error();
  }, function(e) {
    if (error) error();
  });
}

//Fetch a new wallet from the server
//success(modified true/false)
// used locally and iOS
MyWallet.getWallet = function(success, error) {
  var data = {method : 'wallet.aes.json', format : 'json'};

  if (WalletStore.getPayloadChecksum() && WalletStore.getPayloadChecksum().length > 0)
    data.checksum = WalletStore.getPayloadChecksum();

  MyWallet.securePost("wallet", data, function(obj) {
    if (!obj.payload || obj.payload == 'Not modified') {
      if (success) success();
      return;
    }

    WalletStore.setEncryptedWalletData(obj.payload);

    decryptAndInitializeWallet(function() {
      MyWallet.wallet.getHistory();

      if (success) success();
    }, function() {
      if (error) error();
    });
  }, function(e) {
    if (error) error();
  });
};

////////////////////////////////////////////////////////////////////////////////

function decryptAndInitializeWallet(success, error, decrypt_success, build_hd_success) {
  assert(success, 'Success callback required');
  assert(error, 'Error callback required');
  var encryptedWalletData = WalletStore.getEncryptedWalletData();

  if (encryptedWalletData == null || encryptedWalletData.length == 0) {
    error('No Wallet Data To Decrypt');
    return;
  }
  WalletCrypto.decryptWallet(
    encryptedWalletData,
    WalletStore.getPassword(),
    function(obj, rootContainer) {
      decrypt_success && decrypt_success();
      MyWallet.wallet = new Wallet(obj);

      // this sanity check should be done on the load
      // if (!sharedKey || sharedKey.length == 0 || sharedKey.length != 36) {
      //   throw 'Shared Key is invalid';
      // }

      // TODO: pbkdf2 iterations should be stored correctly on wallet wrapper
      if (rootContainer) {
        WalletStore.setPbkdf2Iterations(rootContainer.pbkdf2_iterations);
      }
      //If we don't have a checksum then the wallet is probably brand new - so we can generate our own
      if (WalletStore.getPayloadChecksum() == null || WalletStore.getPayloadChecksum().length == 0) {
        WalletStore.setPayloadChecksum(WalletStore.generatePayloadChecksum());
      }
      if (MyWallet.wallet.isUpgradedToHD === false) {
        WalletStore.sendEvent('hd_wallets_does_not_exist');
      }
      setIsInitialized();
      success();
    },
    error
  );
}

////////////////////////////////////////////////////////////////////////////////

// used in the frontend
MyWallet.makePairingCode = function(success, error) {
  try {
    MyWallet.securePost('wallet', { method : 'pairing-encryption-password' }, function(encryption_phrase) {
      var pwHex = new Buffer(WalletStore.getPassword()).toString('hex');
      var encrypted = WalletCrypto.encrypt(MyWallet.wallet.sharedKey + '|' + pwHex, encryption_phrase, 10);
      success('1|' + MyWallet.wallet.guid + '|' + encrypted);
    }, function(e) {
      error(e);
    });
  } catch (e) {
    error(e);
  }
};

////////////////////////////////////////////////////////////////////////////////
MyWallet.login = function ( user_guid
                          , shared_key
                          , inputedPassword
                          , twoFACode
                          , success
                          , needs_two_factor_code
                          , wrong_two_factor_code
                          , authorization_required
                          , other_error
                          , fetch_success
                          , decrypt_success
                          , build_hd_success) {

  assert(success, 'Success callback required');
  assert(other_error, 'Error callback required');
  assert(twoFACode !== undefined, '2FA code must be null or set');

  var clientTime = (new Date()).getTime();
  var data = { format : 'json', resend_code : null, ct : clientTime, api_code : API.API_CODE };

  if (shared_key) { data.sharedKey = shared_key; }

  var tryToFetchWalletJSON = function(guid, successCallback) {

    var success = function(obj) {
      fetch_success && fetch_success();
      // Even if Two Factor is enabled, some settings need to be saved here,
      // because they won't be part of the 2FA response.

      if (!obj.guid) {
        WalletStore.sendEvent("msg", {type: "error", message: 'Server returned null guid.'});
        other_error('Server returned null guid.');
        return;
      }

      // I should create a new class to store the encrypted wallet over wallet
      WalletStore.setGuid(obj.guid);
      WalletStore.setRealAuthType(obj.real_auth_type);
      WalletStore.setSyncPubKeys(obj.sync_pubkeys);

      if (obj.payload && obj.payload.length > 0 && obj.payload != 'Not modified') {
      } else {
        needs_two_factor_code(obj.auth_type);
        return;
      }
      successCallback(obj)
    };

    var error = function(e) {
       console.log(e);
       var obj = 'object' === typeof e ? e : JSON.parse(e);
       if(obj && obj.initial_error && !obj.authorization_required) {
         other_error(obj.initial_error);
         return;
       }
       WalletStore.sendEvent('did_fail_set_guid');
       if (obj.authorization_required && typeof(authorization_required) === "function") {
         authorization_required(function() {
           MyWallet.pollForSessionGUID(function() {
             tryToFetchWalletJSON(guid, successCallback);
           });
         });
       }
       if (obj.initial_error) {
         WalletStore.sendEvent("msg", {type: "error", message: obj.initial_error});
       }
    };
    API.request("GET", 'wallet/' + guid, data, true, false).then(success).catch(error);
  };

  var tryToFetchWalletWith2FA = function (guid, two_factor_auth_key, successCallback) {

    if (two_factor_auth_key == null) {
      other_error('Two Factor Authentication code this null');
      return;
    }
    if (two_factor_auth_key.length == 0 || two_factor_auth_key.length > 255) {
     other_error('You must enter a Two Factor Authentication code');
     return;
    }
    var success = function(data) {
     if (data == null || data.length == 0) {
       other_error('Server Return Empty Wallet Data');
       return;
     }
     if (data != 'Not modified') { WalletStore.setEncryptedWalletData(data); }
     successCallback(data);
    };
    var error = function (response) {
     WalletStore.setRestoringWallet(false);
     wrong_two_factor_code(response);
    };

    var myData = { guid: guid, payload: two_factor_auth_key, length : two_factor_auth_key.length,  method : 'get-wallet', format : 'plain', api_code : API.API_CODE};
    API.request("POST", 'wallet', myData, true, false).then(success).catch(error);
  };

  var didFetchWalletJSON = function(obj) {

    if (obj.payload && obj.payload.length > 0 && obj.payload != 'Not modified') {
     WalletStore.setEncryptedWalletData(obj.payload);
    }

    if (obj.language && WalletStore.getLanguage() != obj.language) {
     WalletStore.setLanguage(obj.language);
    }
    MyWallet.initializeWallet(inputedPassword, success, other_error, decrypt_success, build_hd_success);
  }

  if(twoFACode == null) {
    tryToFetchWalletJSON(user_guid, didFetchWalletJSON)
  } else {
    // If 2FA is enabled and we already fetched the wallet before, don't fetch
    // it again
    if(user_guid === WalletStore.getGuid() && WalletStore.getEncryptedWalletData()) {
      MyWallet.initializeWallet(inputedPassword, success, other_error, decrypt_success, build_hd_success);
    } else {
      tryToFetchWalletWith2FA(user_guid, twoFACode, didFetchWalletJSON)
    }
  }
};
////////////////////////////////////////////////////////////////////////////////

// used locally
MyWallet.pollForSessionGUID = function(successCallback) {

  if (WalletStore.isPolling()) return;
  WalletStore.setIsPolling(true);
  var data = {format : 'json'};
  var success = function (obj) {
    if (obj.guid) {
      WalletStore.setIsPolling(false);
      WalletStore.sendEvent("msg", {type: "success", message: 'Authorization Successful'});
      successCallback()
    } else {
      if (WalletStore.getCounter() < 600) {
        WalletStore.incrementCounter();
        setTimeout(function() {
          API.request("GET", 'wallet/poll-for-session-guid', data, true, false).then(success).catch(error);
        }, 2000);
      } else {
        WalletStore.setIsPolling(false);
      }
    }
  }
  var error = function() {
    WalletStore.setIsPolling(false);
  }
  API.request("GET", 'wallet/poll-for-session-guid', data, true, false).then(success).catch(error);
};
// used locally
////////////////////////////////////////////////////////////////////////////////

MyWallet.initializeWallet = function(pw, success, other_error, decrypt_success, build_hd_success) {
  assert(success, 'Success callback required');
  assert(other_error, 'Error callback required');
  if (isInitialized || WalletStore.isRestoringWallet()) {
    return;
  }

  function _error(e) {
    WalletStore.setRestoringWallet(false);
    WalletStore.sendEvent("msg", {type: "error", message: e});

    WalletStore.sendEvent('error_restoring_wallet');
    other_error(e);
  }

  WalletStore.setRestoringWallet(true);
  WalletStore.unsafeSetPassword(pw);
  var encryptedWalletData = WalletStore.getEncryptedWalletData();

  decryptAndInitializeWallet(
    function() {
      WalletStore.setRestoringWallet(false);
      didDecryptWallet(success);
    }
    , _error
    , decrypt_success
    , build_hd_success
  );
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// used on iOS
MyWallet.getIsInitialized = function() {
  return isInitialized;
};

// used once
function setIsInitialized() {
  if (isInitialized) return;
  socketConnect();
  isInitialized = true;
}

// used on iOS
MyWallet.connectWebSocket = function() {
  socketConnect();
};
////////////////////////////////////////////////////////////////////////////////
// This should replace backup functions
function syncWallet (successcallback, errorcallback) {

  var panic = function(e) {
      console.log('Panic ' + e);
      window.location.replace("/");
      throw 'Save disabled.';
      // kick out of the wallet in a inconsistent state to prevent save
  };

  if (MyWallet.wallet.isEncryptionConsistent === false) {
    panic("The wallet was not fully enc/decrypted");
  }

  if (!MyWallet.wallet || !MyWallet.wallet.sharedKey
      || MyWallet.wallet.sharedKey.length === 0
      || MyWallet.wallet.sharedKey.length !== 36)
    { throw 'Cannot backup wallet now. Shared key is not set'; };

  WalletStore.disableLogout();

  var _errorcallback = function(e) {
    WalletStore.sendEvent('on_backup_wallet_error');
    WalletStore.sendEvent("msg", {type: "error", message: 'Error Saving Wallet: ' + e});
    // Re-fetch the wallet from server
    MyWallet.getWallet();
    // try to save again:
    // syncWallet(successcallback, errorcallback);
    errorcallback && errorcallback(e);
  };
  try {
    var method = 'update';
    var data = JSON.stringify(MyWallet.wallet, null, 2);
    var crypted = WalletCrypto.encryptWallet( data
                                              , WalletStore.getPassword()
                                              , WalletStore.getPbkdf2Iterations()
                                              , MyWallet.wallet.isUpgradedToHD ?  3.0 : 2.0 );

    if (crypted.length == 0) {
      throw 'Error encrypting the JSON output';
    }

    //Now Decrypt the it again to double check for any possible corruption
    WalletCrypto.decryptWallet(crypted, WalletStore.getPassword(), function(obj) {
      try {
        var oldChecksum = WalletStore.getPayloadChecksum();
        WalletStore.sendEvent('on_backup_wallet_start');
        WalletStore.setEncryptedWalletData(crypted);
        var new_checksum = WalletStore.getPayloadChecksum();
        var data =  {
          length: crypted.length,
          payload: crypted,
          checksum: new_checksum,
          method : method,
          format : 'plain',
          language : WalletStore.getLanguage()
        };

        if (Helpers.isHex(oldChecksum)) {
          data.old_checksum = oldChecksum;
        }

        if (WalletStore.isSyncPubKeys()) {
          // Include HD addresses unless in lame mode:
          var hdAddresses = (
            MyWallet.wallet.hdwallet != undefined &&
            MyWallet.wallet.hdwallet.accounts != undefined
          ) ? [].concat.apply([],
            MyWallet.wallet.hdwallet.accounts.map(function(account) {
              return account.labeledReceivingAddresses
            })) : [];
          data.active = [].concat.apply([],
            [
              MyWallet.wallet.activeAddresses,
              hdAddresses
            ]
          ).join('|');
        }

        MyWallet.securePost(
            "wallet"
          , data
          , function(data) {
              checkWalletChecksum(
                  new_checksum
                , function() {
                    WalletStore.setIsSynchronizedWithServer(true);
                    WalletStore.enableLogout();
                    WalletStore.resetLogoutTimeout();
                    WalletStore.sendEvent('on_backup_wallet_success');
                    successcallback && successcallback();
                    }
                , function() {
                    _errorcallback('Checksum Did Not Match Expected Value');
                    WalletStore.enableLogout();
                  }
              );
            }
          , function(e) {
            WalletStore.enableLogout();
            _errorcallback(e);
          }
        );

      } catch (e) {
        _errorcallback(e);
        WalletStore.enableLogout();
      }
    },
                               function(e) {
                                 console.log(e);
                                 throw("Decryption failed");
                               });
  } catch (e) {
    _errorcallback(e);
    WalletStore.enableLogout();
  }

}
MyWallet.syncWallet = Helpers.asyncOnce(syncWallet, 1500, function(){
  console.log("SAVE CALLED...");
  WalletStore.setIsSynchronizedWithServer(false);
});
////////////////////////////////////////////////////////////////////////////////
// used mainly on blockchain API
MyWallet.handleNTPResponse = function(obj, clientTime) {
  //Calculate serverTimeOffset using NTP alog
  var nowTime = (new Date()).getTime();
  if (obj.clientTimeDiff && obj.serverTime) {
    var serverClientResponseDiffTime = nowTime - obj.serverTime;
    var responseTime = (obj.clientTimeDiff - nowTime + clientTime - serverClientResponseDiffTime) / 2;

    var thisOffset = (serverClientResponseDiffTime - responseTime) / 2;

    if (WalletStore.isHaveSetServerTime()) {
      var sto = (WalletStore.getServerTimeOffset() + thisOffset) / 2;
      WalletStore.setServerTimeOffset(sto);
    } else {
      WalletStore.setServerTimeOffset(thisOffset);
      WalletStore.setHaveSetServerTime();
    }
    console.log('Server Time offset ' + WalletStore.getServerTimeOffset() + 'ms - This offset ' + thisOffset);
  }
};

/**
 * @param {string} address bitcoin address
 * @param {string} message message
 * @return {string} message signature in base64
 */
 // [NOT USED]
MyWallet.signMessage = function(address, message) {
  var addr = WalletStore.getAddress(address);

  if (!addr.priv)
    throw 'Cannot sign a watch only address';

  var decryptedpk = addr.priv;

  // TODO: deal with second password
  // var decryptedpk = MyWallet.decodePK(addr.priv);

  var key = new ECPair(new BigInteger.fromBuffer(decryptedpk), null, {compressed: false});
  if (key.getAddress().toString() != address) {
    key = new ECPair(new BigInteger.fromBuffer(decryptedpk), null, {compressed: true});
  }

  var signatureBuffer = Bitcoin.Message.sign(key, message, Bitcoin.networks.bitcoin);
  return signatureBuffer.toString("base64", 0, signatureBuffer.length);
};

/**
 * @param {string} inputedEmail user email
 * @param {string} inputedPassword user main password
 * @param {string} languageCode fiat currency code (e.g. USD)
 * @param {string} currencyCode language code (e.g. en)
 * @param {function(string, string, string)} success callback function with guid, sharedkey and password
 * @param {function(string)} error callback function with error message
 */
 // used on mywallet, iOS and frontend
MyWallet.createNewWallet = function(inputedEmail, inputedPassword, firstAccountName, languageCode, currencyCode, success, error, isHD) {
  WalletSignup.generateNewWallet(inputedPassword, inputedEmail, firstAccountName, function(createdGuid, createdSharedKey, createdPassword) {

    if (languageCode)
      WalletStore.setLanguage(languageCode);

    WalletStore.unsafeSetPassword(createdPassword);

    success(createdGuid, createdSharedKey, createdPassword);
  }, function (e) {
    error(e);
  }, isHD);
};
// used 3 times
function nKeys(obj) {
  var size = 0, key;
  for (key in obj) {
    size++;
  }
  return size;
}

// used on frontend
MyWallet.recoverFromMnemonic = function(inputedEmail, inputedPassword, recoveryMnemonic, bip39Password, success, error, startedRestoreHDWallet, accountProgress, generateUUIDProgress, decryptWalletProgress) {
  var walletSuccess = function(guid, sharedKey, password) {
    WalletStore.unsafeSetPassword(password);
    var runSuccess = function () {success({ guid: guid, sharedKey: sharedKey, password: password});};
    MyWallet.wallet.restoreHDWallet(recoveryMnemonic, bip39Password, undefined, startedRestoreHDWallet, accountProgress).then(runSuccess).catch(error);
  };
  WalletSignup.generateNewWallet(inputedPassword, inputedEmail, null, walletSuccess, error, true, generateUUIDProgress, decryptWalletProgress);
};

// used frontend and mywallet
MyWallet.logout = function(force) {
  if (!force && WalletStore.isLogoutDisabled())
    return;
  var reload = function() {
    try { window.location.reload(); } catch (e) {
      console.log(e);
    }
  };
  var data = {format : 'plain', api_code : API.API_CODE};
  WalletStore.sendEvent('logging_out');
  API.request("GET", 'wallet/logout', data, true, false).then(reload).catch(reload);
};
// used once
// TODO : should be a helper
function parseMiniKey(miniKey) {
  var check = Bitcoin.crypto.sha256(miniKey + "?");
  if (check[0] !== 0x00) {
    throw 'Invalid mini key';
  }
  return Bitcoin.crypto.sha256(miniKey);
}
// used locally and iOS
// should be a helper
MyWallet.detectPrivateKeyFormat = function(key) {
  // 51 characters base58, always starts with a '5'
  if (/^5[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(key))
    return 'sipa';

  //52 character compressed starts with L or K
  if (/^[LK][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(key))
    return 'compsipa';

  // 52 characters base58
  if (/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}$/.test(key) || /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{43}$/.test(key))
    return 'base58';

  if (/^[A-Fa-f0-9]{64}$/.test(key))
    return 'hex';

  if (/^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=+\/]{44}$/.test(key))
    return 'base64';

  if (/^6P[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{56}$/.test(key))
    return 'bip38';

  if (/^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{21}$/.test(key) ||
      /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25}$/.test(key) ||
      /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{29}$/.test(key) ||
      /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{30}$/.test(key)) {

    var testBytes = Bitcoin.crypto.sha256(key + "?");

    if (testBytes[0] === 0x00 || testBytes[0] === 0x01)
      return 'mini';
  }

  return null;

  console.error('Unknown Key Format ' + key);
};
// should be a helper
function buffertoByteArray(value) {
  return BigInteger.fromBuffer(value).toByteArray();
}
// should be a helper
// used locally and wallet-spender.js
MyWallet.privateKeyStringToKey = function(value, format) {
  var key_bytes = null;

  if (format == 'base58') {
    key_bytes = buffertoByteArray(Base58.decode(value));
  } else if (format == 'base64') {
    key_bytes = buffertoByteArray(new Buffer(value, 'base64'));
  } else if (format == 'hex') {
    key_bytes = buffertoByteArray(new Buffer(value, 'hex'));
  } else if (format == 'mini') {
    key_bytes = buffertoByteArray(parseMiniKey(value));
  } else if (format == 'sipa') {
    var tbytes = buffertoByteArray(Base58.decode(value));
    tbytes.shift(); //extra shift cuz BigInteger.fromBuffer prefixed extra 0 byte to array
    tbytes.shift();
    key_bytes = tbytes.slice(0, tbytes.length - 4);

  } else if (format == 'compsipa') {
    var tbytes = buffertoByteArray(Base58.decode(value));
    tbytes.shift(); //extra shift cuz BigInteger.fromBuffer prefixed extra 0 byte to array
    tbytes.shift();
    tbytes.pop();
    key_bytes = tbytes.slice(0, tbytes.length - 4);
  } else {
    throw 'Unsupported Key Format';
  }

  if (key_bytes.length != 32 && key_bytes.length != 33)
    throw 'Result not 32 or 33 bytes in length';

  return new ECPair(new BigInteger.fromByteArrayUnsigned(key_bytes), null, {compressed: (format !== 'sipa')});
};
// used once
// should be a helper
function parseValueBitcoin(valueString) {
  var valueString = valueString.toString();
  // TODO: Detect other number formats (e.g. comma as decimal separator)
  var valueComp = valueString.split('.');
  var integralPart = valueComp[0];
  var fractionalPart = valueComp[1] || "0";
  while (fractionalPart.length < 8) fractionalPart += "0";
  fractionalPart = fractionalPart.replace(/^0+/g, '');
  var value = BigInteger.valueOf(parseInt(integralPart));
  value = value.multiply(BigInteger.valueOf(100000000));
  value = value.add(BigInteger.valueOf(parseInt(fractionalPart)));
  return value;
}
// used iOS and mywallet
MyWallet.precisionToSatoshiBN = function(x) {
  return parseValueBitcoin(x).divide(BigInteger.valueOf(Math.pow(10, shared.sShift(shared.getBTCSymbol())).toString()));
};
