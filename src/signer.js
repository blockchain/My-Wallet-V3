
// pending_transaction {
//   change_address : BitcoinAddress
//   from_addresses : [String]
//   to_addresses : [{address: BitcoinAddress, value : BigInteger}]
//   generated_addresses : [String]
//   extra_private_keys : {addr : String, priv : ECKey}
//   fee : BigInteger
//   on_error : function
//   on_success : function
//   on_ready_to_send : function
//   on_before_send : function
// }

var Signer = new function() {

  var generated_addresses = [];
  this.to_addresses = [];
  this.from_addresses = [];
  this.fee;
  this.extra_private_keys = {};
  var listeners = [];
  var is_cancelled = false;
  this.base_fee = "undefined";
  var min_free_output_size;
  var min_non_standard_output_size;
  var allow_adjust = true;
  this.ready_to_send_header = 'Transaction Ready to Send.';
  var min_input_confirmations = 0;
  var do_not_use_unspent_cache = false;
  var min_input_size;
  var did_specify_fee_manually = false;
  var sendTxInAmounts = [];
  var sendTxOutAmounts = [];

  // Use web worker based on browser - ignore browserDetection on iOS (browserDetection undefined)
  if(typeof(browserDetection) === "undefined" ||
     !(browserDetection().browser == "ie" && browserDetection().version < 11)) {
    initWebWorker();
  }

  this.init = function() {
    this.fee = BigInteger.ZERO;
    this.base_fee = BigInteger.valueOf(10000);
    min_free_output_size = BigInteger.valueOf(1000000);
    min_non_standard_output_size = BigInteger.valueOf(5460);
    min_input_size = BigInteger.ZERO;

    this.addListener({
      on_error : function(e) {
        console.log(e);
      },
      on_begin_signing : function() {
        this.start = new Date().getTime();
      },
      on_finish_signing : function() {
        console.log('Signing Took ' + (new Date().getTime() - this.start) + 'ms');
      }
    });

    return this;
  };

  this.addListener = function(listener) {
    listeners.push(listener);
  };

  function invoke(cb, obj, ob2) {
    for (var key in listeners) {
      try {
        if (listeners[key][cb])
          listeners[key][cb].call(this, obj, ob2);
      } catch(e) {
        console.log(e);
      }
    }
  }

  this.start = function(second_password) {
    if(second_password == undefined) {
      second_password = null;
    }
    var self = this;

    try {
      invoke('on_start');
      BlockchainAPI.get_unspent(self.from_addresses, function (obj) {
        try {
          if (is_cancelled) {
            throw 'Transaction Cancelled';
          }

          if (obj.unspent_outputs == null || obj.unspent_outputs.length == 0) {
            throw 'No Free Outputs To Spend';
          }

          self.unspent = [];

          for (var i = 0; i < obj.unspent_outputs.length; ++i) {
            var script;
            try {
              script = Bitcoin.Script.fromHex(obj.unspent_outputs[i].script);

              if (Bitcoin.scripts.classifyOutput(script) == 'nonstandard')
                throw 'Strange Script';

            } catch(e) {
              MyWallet.sendEvent("msg", {type: "error", message: 'Error Saving Wallet: ' + e}); //Not a fatal error
              continue;
            }

            var out = {script : script,
                       value : new BigInteger.fromHex(obj.unspent_outputs[i].value_hex),
                       tx_output_n : obj.unspent_outputs[i].tx_output_n,
                       tx_hash : obj.unspent_outputs[i].tx_hash,
                       confirmations : obj.unspent_outputs[i].confirmations
                      };

            self.unspent.push(out);
          }

          self.makeTransaction(second_password);
        } catch (e) {
          default_error(e);
        }
      }, function(e) {
        default_error(e);
      }, min_input_confirmations, do_not_use_unspent_cache);
    } catch (e) {
      default_error(e);
    }
  };

  function isSelectedValueSufficient(txValue, availableValue) {
    return availableValue.compareTo(txValue) == 0 || availableValue.compareTo(txValue.add(min_free_output_size)) >= 0;
  }

  //Select Outputs and Construct transaction
  this.makeTransaction = function(second_password) {
    var self = this;

    try {
      if (is_cancelled) {
        throw 'Transaction Cancelled';
      }

      self.selected_outputs = [];

      var txValue = BigInteger.ZERO;
      for (var i = 0; i < self.to_addresses.length; ++i) {
        txValue = txValue.add(self.to_addresses[i].value);
      }

      var availableValue = BigInteger.ZERO;

      //Add the miners fees
      if (self.fee != null) {
        txValue = txValue.add(self.fee);
      }

      var priority = 0;
      var addresses_used = [];
      var forceFee = false;

      //First try without including watch only
      //If we don't have enough funds ask for the watch only private key
      var unspent_copy = self.unspent.slice(0);
      function parseOut(out) {
        var addr = Bitcoin.Address.fromOutputScript(out.script).toString();

        if (addr == null) {
          throw 'Unable to decode output address from transaction hash ' + out.tx_hash;
        }

        if (out.script == null) {
          throw 'Output script is null (' + out.tx_hash + ':' + out.tx_output_n + ')';
        }

        var outTxHash = new Buffer(out.tx_hash, "hex");
        Array.prototype.reverse.call(outTxHash);

        var transactionInputDict = {outpoint: {hash: outTxHash.toString("hex"), index: out.tx_output_n, value:out.value}, script: out.script, sequence: 4294967295};

        return { addr : addr , transactionInputDict : transactionInputDict };
      };

      //Loop once without watch only, then again with watch only
      var includeWatchOnly = false;
      while(true) {
        for (var i = 0; i < unspent_copy.length; ++i) {
          var out = unspent_copy[i];

          if (!out) continue;

          try {
            var addr_input_obj = parseOut(out);

            if (!includeWatchOnly && MyWallet.isWatchOnlyLegacyAddress(addr_input_obj.addr)) {
              continue;
            }

            if (self.from_addresses != null && $.inArray(addr_input_obj.addr, self.from_addresses) == -1) {
              continue;
            }

            //Ignore inputs less than min_input_size
            if (out.value.compareTo(min_input_size) < 0) {
              continue;
            }

            //If the output happens to be greater than tx value then we can make this transaction with one input only
            //So discard the previous selected outs
            //out.value.compareTo(min_free_output_size) >= 0 because we want to prefer a change output of greater than 0.01 BTC
            //Unless we have the extact tx value
            if (out.value.compareTo(txValue) == 0 || isSelectedValueSufficient(txValue, out.value)) {
              self.selected_outputs = [addr_input_obj.transactionInputDict];

              unspent_copy[i] = null; //Mark it null so we know it is used

              addresses_used = [addr_input_obj.addr];

              priority = out.value.intValue() * out.confirmations;

              availableValue = out.value;

              break;
            } else {
              //Otherwise we add the value of the selected output and continue looping if we don't have sufficient funds yet
              self.selected_outputs.push(addr_input_obj.transactionInputDict);

              unspent_copy[i] = null; //Mark it null so we know it is used

              addresses_used.push(addr_input_obj.addr);

              priority += out.value.intValue() * out.confirmations;

              availableValue = availableValue.add(out.value);

              if (isSelectedValueSufficient(txValue, availableValue))
                break;
            }
          } catch (e) {
            //An error, but probably recoverable
            MyWallet.sendEvent("msg", {type: "error", message: e});
          }
        }

        if (isSelectedValueSufficient(txValue, availableValue)) {
          break;
        }

        if (includeWatchOnly) {
          break;
        }

        includeWatchOnly = true;
      }

      function insufficientError() {
        default_error('Insufficient funds. Value Needed ' +  formatBTC(txValue.toString()) + '. Available amount ' + formatBTC(availableValue.toString()));
      }

      var difference = availableValue.subtract(txValue);

      if (difference.compareTo(BigInteger.ZERO) < 0) {
        //Can only adjust when there is one recipient
        if (self.to_addresses.length == 1 && availableValue.compareTo(BigInteger.ZERO) > 0 && allow_adjust) {
          insufficient_funds(txValue, availableValue, function() {

            //Subtract the difference from the to address
            var adjusted = self.to_addresses[0].value.add(difference);
            if (adjusted.compareTo(BigInteger.ZERO) > 0 && adjusted.compareTo(txValue) <= 0) {
              self.to_addresses[0].value = adjusted;
              self.makeTransaction(second_password);

              return;
            } else {
              insufficientError();
            }
          }, function() {
            insufficientError();
          });
        } else {
          insufficientError();
        }

        return;
      }

      if (self.selected_outputs.length == 0) {
        default_error('No Available Outputs To Spend.');
        return;
      }

      var sendTx = new Bitcoin.Transaction();

      sendTxInAmounts = [];
      for (var i = 0; i < self.selected_outputs.length; i++) {
        var transactionInputDict = self.selected_outputs[i];
        sendTx.addInput(transactionInputDict.outpoint.hash, transactionInputDict.outpoint.index);
        sendTxInAmounts.push(transactionInputDict.outpoint.value);
      }

      sendTxOutAmounts = [];
      for (var i =0; i < self.to_addresses.length; ++i) {
        var addrObj = self.to_addresses[i];
        if (addrObj.m != null) {
          sendTx.addOutputScript(Bitcoin.scripts.multisigOutput(addrObj.m, addrObj.pubkeys), parseInt(addrObj.value));
          sendTxOutAmounts.push(addrObj.value);
        } else {
          sendTx.addOutput(addrObj.address, parseInt(addrObj.value));
          sendTxOutAmounts.push(addrObj.value);
        }

        //If less than 0.01 BTC force fee
        if (addrObj.value.compareTo(min_free_output_size) < 0) {
          forceFee = true;
        }
      }

      //Now deal with the change
      var	changeValue = availableValue.subtract(txValue);

      //Consume the change if it would create a very small none standard output
      //Perhaps this behaviour should be user specified
      if (changeValue.compareTo(min_non_standard_output_size) > 0) {
        if (self.change_address != null) //If change address speicified return to that
          sendTx.addOutput(self.change_address, parseInt(changeValue));
        else if (addresses_used.length > 0) { //Else return to a random from address if specified
          sendTx.addOutput(Bitcoin.Address.fromBase58Check(addresses_used[Math.floor(Math.random() * addresses_used.length)]), parseInt(changeValue));
        } else { //Otherwise return to random unarchived
          sendTx.addOutput(Bitcoin.Address.fromBase58Check(MyWallet.getPreferredLegacyAddress()), parseInt(changeValue));
        }
        sendTxOutAmounts.push(changeValue);

        //If less than 0.01 BTC force fee
        if (changeValue.compareTo(min_free_output_size) < 0) {
          forceFee = true;
        }
      }

      //Now Add the public note
      /*

       function makeArrayOf(value, length) {
       var arr = [], i = length;
       while (i--) {
       arr[i] = value;
       }
       return arr;
       }

       if (self.note)  {
       var bytes = stringToBytes('Message: ' + self.note);

       var ibyte = 0;
       while (true) {
       var tbytes = bytes.splice(ibyte, ibyte+120);

       if (tbytes.length == 0)
       break;

       //Must pad to at least 33 bytes
       //Decode function should strip appending zeros
       if (tbytes.length < 33) {
       tbytes = tbytes.concat(makeArrayOf(0, 33-tbytes.length));
       }

       sendTx.addOutputScript(Bitcoin.Script.createPubKeyScript(tbytes), 0);
       sendTxOutAmounts.push(0);

       ibyte += 120;
       }
       }  */

      //Estimate scripot sig (Cannot use serialized tx size yet becuase we haven't signed the inputs)
      //18 bytes standard header
      //standard scriptPubKey 24 bytes
      //Stanard scriptSig 64 bytes
      var estimatedSize = sendTx.toHex().length/2 + (138 * sendTx.ins.length);

      priority /= estimatedSize;

      var kilobytes = Math.max(1, Math.ceil(parseFloat(estimatedSize / 1000)));

      var fee_is_zero = (!self.fee || self.fee.compareTo(self.base_fee) < 0);

      var set_fee_auto = function() {
        //Forced Fee
        self.fee = self.base_fee.multiply(BigInteger.valueOf(kilobytes));

        self.makeTransaction(second_password);
      };

      //Priority under 57 million requires a 0.0005 BTC transaction fee (see https://en.bitcoin.it/wiki/Transaction_fees)
      if (fee_is_zero && (forceFee || kilobytes > 1)) {
        if (self.fee && did_specify_fee_manually) {
          ask_to_increase_fee(function() {
            set_fee_auto();
          }, function() {
            self.tx = sendTx;
            self.determinePrivateKeys(function() {
              self.signInputs();
            }, second_password);
          }, self.fee, self.base_fee.multiply(BigInteger.valueOf(kilobytes)));
        } else {
          //Forced Fee
          set_fee_auto();
        }
      } else if (fee_is_zero && (MyWallet.getRecommendIncludeFee() || priority < 77600000)) {
        ask_for_fee(function() {
          set_fee_auto();
        }, function() {
          self.tx = sendTx;

          self.determinePrivateKeys(function() {
            self.signInputs();
          }, second_password);
        });
      } else {
        self.tx = sendTx;

        self.determinePrivateKeys(function() {
          self.signInputs();
        }, second_password);
      }
    } catch (e) {
      default_error(e);
    }
  }

  function ask_for_fee(yes, no) {
    yes();
  }

  function ask_to_increase_fee(yes, no, customFee, recommendedFee) {
    yes();
  }

  function insufficient_funds(amount_required, amount_available, yes, no) {
    no();
  }

  this.determinePrivateKeys = function(success, second_password) {
    var self = this;

    try {
      if (is_cancelled) {
        throw 'Transaction Cancelled';
      }

      if (self.selected_outputs.length != self.tx.ins.length) {
        throw 'Selected Outputs Count != Tx Inputs Length';
      }

      var tmp_cache = {};

      for (var i = 0; i < self.selected_outputs.length; ++i) {
        var connected_script = self.selected_outputs[i].script;

        if (connected_script == null) {
          throw 'determinePrivateKeys() Connected script is null';
        }

        if (connected_script.priv_to_use == null) {
          var inputAddress = Bitcoin.Address.fromOutputScript(connected_script).toString();

          //Find the matching private key
          if (tmp_cache[inputAddress]) {
            connected_script.priv_to_use = tmp_cache[inputAddress];
          } else if (self.extra_private_keys && self.extra_private_keys[inputAddress]) {
            connected_script.priv_to_use = self.extra_private_keys[inputAddress];
          } else if (MyWallet.legacyAddressExists(inputAddress) && !MyWallet.isWatchOnlyLegacyAddress(inputAddress)) {
            try {
              connected_script.priv_to_use = second_password == null ? MyWallet.getPrivateKey(inputAddress) : MyWallet.decryptSecretWithSecondPassword(MyWallet.getPrivateKey(inputAddress), second_password, MyWallet.getSharedKey());
            } catch (e) {
              console.log(e);
            }
          }
          if (connected_script.priv_to_use == null) {
            default_error("No private key found!");
            // //No private key found, ask the user to provide it
            // ask_for_private_key(function (key) {
            //
            //     try {
            //         if (inputAddress == MyWallet.getUnCompressedAddressString(key) || inputAddress == MyWallet.getCompressedAddressString(key)) {
            //             self.extra_private_keys[inputAddress] = Bitcoin.Base58.encode(key.priv);
            //
            //             self.determinePrivateKeys(success); //Try Again
            //         } else {
            //             throw 'The private key you entered does not match the bitcoin address';
            //         }
            //     } catch (e) {
            //         default_error(e);
            //     }
            // }, function(e) {
            //     //User did not provide it, try and re-construct without it
            //     //Remove the address from the from list
            //     self.from_addresses = $.grep(self.from_addresses, function(v) {
            //         return v != inputAddress;
            //     });
            //
            //     //Remake the transaction without the address
            //     self.makeTransaction();
            //
            // }, inputAddress);

            return false;
          } else {
            //Performance optimization
            //Only Decode the key once sand save it in a temporary cache
            tmp_cache[inputAddress] = connected_script.priv_to_use;
          }
        }
      }

      success();
    } catch (e) {
      default_error(e);
    }
  }

  this.signWebWorker = function(success, _error) {
    var didError = false;
    var error = function(e) {
      if (!didError) { _error(e); didError = true; }
    };

    try {
      var self = this;
      var nSigned = 0;
      var nWorkers = Math.min(3, self.tx.ins.length);
      var rng = new SecureRandom();

      self.worker = [];
      for (var i = 0; i < nWorkers; ++i)  {
        self.worker[i] =  new Worker(MyWallet.getWebWorkerLoadPrefix() + 'signer' + (min ? '.min.js' : '.js'));

        self.worker[i].addEventListener('message', function(e) {
          var data = e.data;

          try {
            switch (data.cmd) {
            case 'on_sign':
              invoke('on_sign_progress', parseInt(data.outputN)+1);

              self.tx.ins[data.outputN].script = new Bitcoin.Script(data.script);

              ++nSigned;

              if (nSigned == self.tx.ins.length) {
                terminateWorkers();
                success();
              }

              break;
            case 'on_message': {
              console.log(data.message);
              break;
            }
            case 'on_error': {
              throw data.e;
            }
            };
          } catch (e) {
            terminateWorkers();
            error(e);
          }
        }, false);

        self.worker[i].addEventListener('error', function(e) {
          error(e);
        });

        self.worker[i].postMessage({cmd : 'load_resource' , path : MyWallet.getWebWorkerLoadPrefix() + 'bitcoinjs' + (min ? '.min.js' : '.js')});

        //Generate and pass seed to the webworker
        var seed = new Array(32);

        rng.nextBytes(seed);

        self.worker[i].postMessage({cmd : 'seed', seed : Crypto.util.bytesToHex(seed)});
      }

      for (var outputN = 0; outputN < self.selected_outputs.length; ++ outputN) {
        var connected_script = self.selected_outputs[outputN].script;

        if (connected_script == null) {
          throw 'signWebWorker() Connected Script Is Null';
        }

        self.worker[outputN % nWorkers].postMessage({cmd : 'sign_input', tx : self.tx, outputN : outputN, priv_to_use : connected_script.priv_to_use, connected_script : connected_script});
      }
    } catch (e) {
      error(e);
    }
  };

  this.signNormal = function(success, error) {
    var self = this;
    var outputN = 0;

    var signOne = function() {
      setTimeout(function() {
        if (is_cancelled) {
          error();
          return;
        }

        try {
          invoke('on_sign_progress', outputN+1);

          var connected_script = self.selected_outputs[outputN].script;

          if (connected_script == null) {
            throw 'signNormal() Connected Script Is Null';
          }

          var signed_script = signInput(self.tx, outputN, connected_script.priv_to_use, connected_script);

          if (signed_script) {
            self.tx.ins[outputN].script = signed_script;

            outputN++;

            if (outputN == self.tx.ins.length) {
              success();
            } else {
              signOne(); //Sign The Next One
            }
          } else {
            throw 'Unknown error signing transaction';
          }
        } catch (e) {
          error(e);
        }

      }, 1);
    };

    signOne();
  };

  this.signInputs = function() {
    var self = this;

    try {
      invoke('on_begin_signing');

      var success = function() {
        invoke('on_finish_signing');

        self.is_ready = true;
        self.ask_to_send();
      };

      self.signWebWorker(success, function(e) {
        console.log(e);

        self.signNormal(success, function(e){
          default_error(e);
        });
      });
    } catch (e) {
      default_error(e);
    }
  };

  function terminateWorkers() {
    if (this.worker) {
      for (var i = 0; i < this.worker.length; ++i)  {
        try {
          this.worker[i].terminate();
        } catch (e) { }
      }
    }
  }

  this.cancel = function() {
    if (!this.has_pushed) {
      terminateWorkers();
      default_error('Transaction Cancelled');
    }
  };

  this.send = function() {
    var self = this;

    if (is_cancelled) {
      default_error('This transaction has already been cancelled');
      return;
    }

    if (!self.is_ready) {
      default_error('Transaction is not ready to send yet');
      return;
    }

    invoke('on_before_send');

    if (generated_addresses.length > 0) {
      self.has_saved_addresses = true;

      MyWallet.backupWallet('update', function() {
        self.pushTx();
      }, function() {
        default_error('Error Backing Up Wallet. Cannot Save Newly Generated Keys.');
      });
    } else {
      self.pushTx();
    }
  };

  this.pushTx = function() {
    var self = this;

    if (is_cancelled) //Only call once
      return;

    self.has_pushed = true;

    BlockchainAPI.push_tx(self.tx, self.note, function(response) {
      default_success(response);
    }, function(response) {
      default_error(response);
    });
  };

  function ask_for_private_key(success, error) {
    error('Cannot ask for private key without user interaction disabled');
  }

  this.ask_to_send = function() {
    this.send(); //By Default Just Send
  };

  default_error = function(error) {
    if (is_cancelled) //Only call once
      return;

    is_cancelled = true;

    if (!this.has_pushed && generated_addresses.length > 0) {
      //When an error occurs during send (or user cancelled) we need to remove the addresses we generated
      for (var i = 0; i < generated_addresses.length; ++i) {
        MyWallet.deleteLegacyAddress(generated_addresses[i]);
      }

      if (this.has_saved_addresses)
        MyWallet.backupWallet();
    }

    invoke('on_error', error);
  };

  default_success = function() {
    invoke('on_success');
  };

  function exceptionToString(err) {
    var vDebug = "";
    for (var prop in err)  {
      vDebug += "property: "+ prop+ " value: ["+ err[prop]+ "]\n";
    }
    return "toString(): " + " value: [" + err.toString() + "]";
  }

  function IsCanonicalSignature(vchSig) {
    if (vchSig.length < 9)
      throw 'Non-canonical signature: too short';
    if (vchSig.length > 73)
      throw 'Non-canonical signature: too long';
    var nHashType = vchSig[vchSig.length - 1];
    if (nHashType != Bitcoin.Transaction.SIGHASH_ALL && nHashType != Bitcoin.Transaction.SIGHASH_NONE && nHashType != Bitcoin.Transaction.SIGHASH_SINGLE && nHashType != Bitcoin.Transaction.SIGHASH_ANYONECANPAY)
      throw 'Non-canonical signature: unknown hashtype byte ' + nHashType;
    if (vchSig[0] != 0x30)
      throw 'Non-canonical signature: wrong type';
    if (vchSig[1] != vchSig.length-3)
      throw 'Non-canonical signature: wrong length marker';
    var nLenR = vchSig[3];
    if (5 + nLenR >= vchSig.length)
      throw 'Non-canonical signature: S length misplaced';
    var nLenS = vchSig[5+nLenR];
    if (nLenR+nLenS+7 != vchSig.length)
      throw 'Non-canonical signature: R+S length mismatch';

    var n = 4;
    if (vchSig[n-2] != 0x02)
      throw 'Non-canonical signature: R value type mismatch';
    if (nLenR == 0)
      throw 'Non-canonical signature: R length is zero';
    if (vchSig[n+0] & 0x80)
      throw 'Non-canonical signature: R value negative';
    if (nLenR > 1 && (vchSig[n+0] == 0x00) && !(vchSig[n+1] & 0x80))
      throw 'Non-canonical signature: R value excessively padded';

    var n = 6+nLenR;
    if (vchSig[n-2] != 0x02)
      throw 'Non-canonical signature: S value type mismatch';
    if (nLenS == 0)
      throw 'Non-canonical signature: S length is zero';
    if (vchSig[n+0] & 0x80)
      throw 'Non-canonical signature: S value negative';
    if (nLenS > 1 && (vchSig[n+0] == 0x00) && !(vchSig[n+1] & 0x80))
      throw 'Non-canonical signature: S value excessively padded';

    return true;
  }

  function initWebWorker() {
    try {
      //Init WebWorker
      //Window is not defined in WebWorker
      if (typeof window == "undefined" || !window) {
        var window = {};

        self.addEventListener('message', function(e) {
          var data = e.data;
          try {
            switch (data.cmd) {
            case 'seed':
              var word_array = Crypto.util.bytesToWords(Crypto.util.hexToBytes(data.seed));

              for (var i in word_array) {
                rng_seed_int(word_array[i]);
              }
              break;
            case 'decrypt':
              var decoded = Crypto.AES.decrypt(data.data, data.password, { mode: new Crypto.mode.CBC(Crypto.pad.iso10126), iterations : data.pbkdf2_iterations});

              self.postMessage({cmd : 'on_decrypt', data : decoded});

              break;
            case 'load_resource':
              importScripts(data.path);
              break;
            case 'sign_input':
              var tx = new Bitcoin.Transaction(data.tx);

              var connected_script = new Bitcoin.Script(data.connected_script);

              var signed_script = signInput(tx, data.outputN, data.priv_to_use, connected_script);

              if (signed_script) {
                self.postMessage({cmd : 'on_sign', script : signed_script, outputN : data.outputN});
              } else {
                throw 'Unknown Error Signing Script ' + data.outputN;
              }
              break;
            default:
              throw 'Unknown Command';
            };
          } catch (e) {
            self.postMessage({cmd : 'on_error', e : exceptionToString(e)});
          }
        }, false);
      }
    } catch (e) { }
  };

  function signInput(tx, inputN, base58Key, connected_script, type) {
    type = type ? type : Bitcoin.Transaction.SIGHASH_ALL;

    var inputBitcoinAddress = Bitcoin.Address.fromOutputScript(connected_script);

    var format = MyWallet.detectPrivateKeyFormat(base58Key);
    var key = MyWallet.privateKeyStringToKey(base58Key, format);

    // var decoded = MyWallet.B58LegacyDecode(base58Key);
    // var key = new Bitcoin.ECKey(new BigInteger.fromBuffer(decoded), false);

    // var key = new Bitcoin.ECKey(new BigInteger.fromBuffer(base58Key), false);

    if (MyWallet.getUnCompressedAddressString(key) == inputBitcoinAddress.toString()) {
    } else if (MyWallet.getCompressedAddressString(key) == inputBitcoinAddress.toString()) {
      key = new Bitcoin.ECKey(key.d, true);
    } else {
      throw 'Private key does not match bitcoin address ' + inputBitcoinAddress.toString() + ' != ' + MyWallet.getUnCompressedAddressString(key) + ' | '+ MyWallet.getCompressedAddressString(key);
    }
    var signature = tx.signInput(inputN, connected_script, key);

    if (!IsCanonicalSignature(signature)) {
      throw 'IsCanonicalSignature returned false';
    }

    tx.setInputScript(inputN, Bitcoin.scripts.pubKeyHashInput(signature, key.pub));

    if (tx.ins[inputN].script == null) {
      throw 'Error creating input script';
    }

    return tx.ins[inputN].script;
  }

};
