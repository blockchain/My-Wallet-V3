function HDWalletAccount(seed, network) {
    var Bitcoin = Browserify.Bitcoin;

    network = network || Bitcoin.networks.bitcoin;

    // Stored in a closure to make accidental serialization less likely
    var masterkey = null;
    var me = this;
    this.internalAccount = null;
    this.externalAccount = null;

    // Addresses
    this.addresses = [];
    this.changeAddresses = [];
    // Transaction output data
    this.outputs = {};
    
    // In-memory cache for generated keys
    var keyCache = [];
    var changeKeyCache = [];

    // Make a new master key
    this.newNodeFromExtKey = function(extKey, cache) {
        if(cache == undefined) {
          var accountZero = Bitcoin.HDNode.fromBase58(extKey); 
          this.externalAccount = accountZero.derive(0);
          this.internalAccount = accountZero.derive(1);
        } else {
          this.externalAccount = new Bitcoin.HDNode(cache.externalAccountPubKey, cache.externalAccountChainCode)
          this.internalAccount = new Bitcoin.HDNode(cache.internalAccountPubKey, cache.internalAccountChainCode)
        }

        me.addresses = [];
        me.changeAddresses = [];

        keyCache = [];
        changeKeyCache = [];

        me.outputs = {};
    };

    // Make a new master key
    this.newMasterKey = function(seed) {
        seed = seed || crypto.randomBytes(32);
        masterkey = Bitcoin.HDNode.fromSeedBuffer(seed, network);

        // HD first-level child derivation method should be hardened
        // See https://bitcointalk.org/index.php?topic=405179.msg4415254#msg4415254
        var accountZero = masterkey.deriveHardened(0);
        this.externalAccount = accountZero.derive(0);
        this.internalAccount = accountZero.derive(1);

        me.addresses = [];
        me.changeAddresses = [];

        keyCache = [];
        changeKeyCache = [];

        me.outputs = {};
    };

    if (seed) {
        this.newMasterKey(seed);
    }

    this.getAddressAtIndex = function(idx) {
        if (keyCache[idx]) {
            return keyCache[idx].getAddress().toString();
        }

        var key = this.externalAccount.derive(idx);
        keyCache[idx] = key;
        return key.getAddress().toString();
    };

    this.getChangeAddressAtIndex = function(idx) {
        if (changeKeyCache[idx]) {
            return changeKeyCache[idx].getAddress().toString();
        }

        var key = this.internalAccount.derive(idx);
        changeKeyCache[idx] = key;
        return key.getAddress().toString();
    };

    this.generateAddress = function() {
        var index = this.addresses.length;
        var key;
        if (keyCache[index]) {
            key = keyCache[index];
        }
        else {
            key = this.externalAccount.derive(index);
        }

        this.addresses.push(key.getAddress().toString());
        return this.addresses[this.addresses.length - 1];
    };

    this.generateChangeAddress = function() {
        var index = this.changeAddresses.length;
        var key;
        if (changeKeyCache[index]) {
            key = changeKeyCache[index];
        }
        else {
            key = this.internalAccount.derive(index);
        }

        this.changeAddresses.push(key.getAddress().toString());
        return this.changeAddresses[this.changeAddresses.length - 1];
    };

    this.getBalance = function() {
        return this.getUnspentOutputs().reduce(function(memo, output){
            return memo + output.value;
        }, 0);
    };

    this.getUnspentOutputs = function() {
        var utxo = [];

        for(var key in this.outputs){
            var output = this.outputs[key];
            if(!output.to) utxo.push(outputToUnspentOutput(output));
        }

        return utxo;
    };

    this.setUnspentOutputs = function(utxo) {
        console.warn("setUnspentOutputs is deprecated, please use the constructor option instead");
        var a = processUnspentOutputs(utxo);
        this.outputs = processUnspentOutputs(utxo);
    };

    function processUnspentOutputs(utxos) {
        var outputs = {};
        utxos.forEach(function(utxo) {
            var hash = new Buffer(utxo.hash, "hex");
            var index = utxo.index;
            var address = utxo.address;
            var value = utxo.value;
            if (index === undefined) index = utxo.outputIndex;

            assert.equal(hash.length, 32, "Expected hash length of 32, got " + hash.length);
            assert.equal(typeof index, "number", "Expected number index, got " + index);
            assert.doesNotThrow(function() {
                Bitcoin.Address.fromBase58Check(address);
            }, "Expected Base58 Address, got " + address);
            assert.equal(typeof value, "number", "Expected number value, got " + value);
            var key = utxo.hash + ":" + utxo.index;
            outputs[key] = {
                from: key,
                address: address,
                value: value,
                pending: utxo.pending
            };
        });
        return outputs;
    }

    function outputToUnspentOutput(output){
        var hashAndIndex = output.from.split(":");

        return {
            hash: hashAndIndex[0],
            outputIndex: parseInt(hashAndIndex[1]),
            address: output.address,
            value: output.value,
            pending: output.pending
        };
    }

    function unspentOutputToOutput(o) {
        var hash = o.hash;
        var key = hash + ":" + o.outputIndex;
        return {
            from: key,
            address: o.address,
            value: o.value,
            pending: o.pending
        };
    }

    function validateUnspentOutput(uo) {
        var missingField;

        if (isNullOrUndefined(uo.hash)) {
            missingField = "hash";
        }

        var requiredKeys = ['outputIndex', 'address', 'value'];
        requiredKeys.forEach(function (key) {
            if (isNullOrUndefined(uo[key])){
                missingField = key;
            }
        });

        if (missingField) {
            var message = [
                'Invalid unspent output: key', missingField, 'is missing.',
                'A valid unspent output must contain'
            ];
            message.push(requiredKeys.join(', '));
            message.push("and hash");
            throw new Error(message.join(' '));
        }
    }

    function isNullOrUndefined(value) {
        return value == undefined;
    }

    this.processPendingTx = function(tx){
        processTx(tx, true);
    };

    this.processConfirmedTx = function(tx){
        processTx(tx, false);
    };

    function processTx(tx, isPending) {
        var txid = tx.getId();

        tx.outs.forEach(function(txOut, i) {
            var address;

            try {
                address = Bitcoin.Address.fromOutputScript(txOut.script, network).toString();
            } catch(e) {
                if (!(e.message.match(/has no matching Address/))) {
                    throw e;
                }
            }

            if (isMyAddress(address)) {
                var output = txid + ':' + i;

                me.outputs[output] = {
                    from: output,
                    value: txOut.value,
                    address: address,
                    pending: isPending
                };
            }
        });

        tx.ins.forEach(function(txIn, i) {
            // copy and convert to big-endian hex
            var txinId = new Buffer(txIn.hash);
            Array.prototype.reverse.call(txinId);
            txinId = txinId.toString('hex');

            var output = txinId + ':' + txIn.index;

            if (!(output in me.outputs)) {
                return;
            }

            if (isPending) {
                me.outputs[output].to = txid + ':' + i;
                me.outputs[output].pending = true;
            } else {
                delete me.outputs[output];
            }
        });
    }

    this.createTx = function(to, value, fixedFee, unspentOutputs, changeAddress, listener) {
        assert(value > network.dustThreshold, value + ' must be above dust threshold (' + network.dustThreshold + ' Satoshis)');

        var utxos = getCandidateOutputs(unspentOutputs, value);
        var accum = 0;
        var subTotal = value;

        var tx = new Bitcoin.Transaction();
        tx.addOutput(to, value);

        for (var i = 0; i < utxos.length; ++i) {
            var utxo = utxos[i];

            tx.addInput(utxo.hash, utxo.index);

            var fee = fixedFee == undefined ? estimateFeePadChangeOutput(tx) : fixedFee;

            accum += utxo.value;
            subTotal = value + fee;
            if (accum >= subTotal) {
                var change = accum - subTotal;

                if (change > network.dustThreshold) {
                    tx.addOutput(changeAddress || getChangeAddress(), change);
                }

                break;
            }
        }

        assert(accum >= subTotal, 'Insufficient funds. Value Needed ' +  subTotal + '. Available amount ' + accum);

        this.signWith(tx, utxos, listener);
        return tx;
    };

    function getCandidateOutputs(unspentOutputs, value) {
        var unspent = [];

        for (var key in unspentOutputs) {
            var output = unspentOutputs[key];
            if (!output.pending) {
                unspent.push(output);
            }
        }

        var sortByValueDesc = unspent.sort(function(o1, o2){
            return o2.value - o1.value;
        });

        return sortByValueDesc;
    }

    this.estimatePaddedFee = function(tx, network) {
        var tmpTx = tx.clone();
        tmpTx.addOutput(getChangeAddress(), network.dustSoftThreshold || 0);

        return network.estimateFee(tmpTx);
    };

    this.getChangeAddress = function() {
        if(me.changeAddresses.length === 0) {
            me.generateChangeAddress();
        }
        return me.changeAddresses[me.changeAddresses.length - 1];
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
            if (keyCache[index]) {
                key = keyCache[index];
            }
            else {
                key = this.externalAccount.derive(index);
                keyCache[index] = key;
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

    this.signWith = function(tx, unspentOutputs, listener) {
        listener.on_begin_signing && listener.on_begin_signing();

        tx.ins.forEach(function(input, i) {
            setTimeout(function() {
                listener.on_sign_progress && listener.on_sign_progress(i+1);
            }, 0);
            
            var unspent = unspentOutputs[i];

            if (unspent.xpub) {
                var pub = me.generateKeyFromPath(unspent.xpub.path);
                var key = pub.privKey;
            }

            tx.sign(i, key);
        });

        listener.on_finish_signing && listener.on_finish_signing();

        return tx;
    };

    this.getMasterKey = function() {
        return masterkey;
    };

    this.getinternalAccount = function() {
        return this.internalAccount;
    };

    this.getExternalAccount = function() {
        return this.externalAccountl;
    };

    this.getPrivateKey = function(index) {
        if (keyCache[index]) {
            return keyCache[index].privKey;
        }

        return this.externalAccount.derive(index).privKey;
    };

    this.getInternalPrivateKey = function(index) {
        if (changeKeyCache[index]) {
            return changeKeyCache[index].privKey;
        }

        return this.internalAccount.derive(index).privKey;
    };

    this.getPrivateKeyForAddress = function(address) {
        var index;
        if((index = this.addresses.indexOf(address)) > -1) {
            return this.getPrivateKey(index);
        } else if((index = this.changeAddresses.indexOf(address)) > -1) {
            return this.getInternalPrivateKey(index);
        } else {
            throw new Error('Unknown address. Make sure the address is from the keychain and has been generated.');
        }
    };

    function isReceiveAddress(address){
        return me.addresses.indexOf(address) > -1;
    }

    function isChangeAddress(address){
        return me.changeAddresses.indexOf(address) > -1;
    }

    function isMyAddress(address) {
        return isReceiveAddress(address) || isChangeAddress(address);
    }
}
