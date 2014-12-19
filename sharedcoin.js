var SharedCoin = new function() {
    var SharedCoin = this;
    var DonationPercent = 0.5;
    var AjaxTimeout = 120000;
    var LastSignatureSubmitTime = 0;
    var MinTimeBetweenSubmits = 120000;
    var options = {};
    var version = 3;
    var URL = MyWallet.getSharedcoinEndpoint() + '?version=' + version;
    var extra_private_keys = {};
    var seed_prefix = 'sharedcoin-seed:';

    

    Bitcoin.Transaction.deserialize = function (buffer)
    {

        function readVarInt(buff) {
            var tbyte, tbytes;

            tbyte = buff.splice(0, 1)[0];

            if (tbyte < 0xfd) {
                tbytes = [tbyte];
            } else if (tbyte == 0xfd) {
                tbytes = buff.splice(0, 2);
            } else if (tbyte == 0xfe) {
                tbytes = buff.splice(0, 4);
            } else {
                tbytes = buff.splice(0, 8);
            }

            return BigInteger.fromByteArrayUnsigned(tbytes);
        }

        function readUInt32(buffer) {
            return new BigInteger(buffer.splice(0, 4).reverse()).intValue();
        }

        var tx = new Bitcoin.Transaction();

        tx.version = readUInt32(buffer);

        var txInCount = readVarInt(buffer).intValue();

        for (var i = 0; i < txInCount; i++) {

            var outPointHashBytes = buffer.splice(0,32);
            var outPointHash = Crypto.util.bytesToBase64(outPointHashBytes);

            var outPointIndex = readUInt32(buffer);

            var scriptLength = readVarInt(buffer).intValue();
            var script = new Bitcoin.Script(buffer.splice(0, scriptLength));
            var sequence = readUInt32(buffer);

            var input = new Bitcoin.TransactionIn({outpoint : {hash: outPointHash, index : outPointIndex}, script: script,  sequence: sequence});

            tx.ins.push(input);
        }


        var txOutCount = readVarInt(buffer).intValue();
        for (var i = 0; i < txOutCount; i++) {

            var valueBytes = buffer.splice(0, 8);
            var scriptLength = readVarInt(buffer).intValue();
            var script = new Bitcoin.Script(buffer.splice(0, scriptLength));

            var out = new Bitcoin.TransactionOut({script : script, value : valueBytes})

            tx.outs.push(out);
        }

        tx.lock_time = readUInt32(buffer);

        return tx;
    };

    function divideUniformlyRandomly(sum, n)
    {
        var nums = [];
        var upperbound = Math.round(sum * 1.0 / n);
        var offset = Math.round(0.5 * upperbound);

        var cursum = 0;
        for (var i = 0; i < n; i++)
        {
            var rand = Math.floor((Math.random() * upperbound) + offset);
            if (cursum + rand > sum || i == n - 1)
            {
                rand = sum - cursum;
            }
            cursum += rand;
            nums[i] = rand;
            if (cursum == sum)
            {
                break;
            }
        }
        return nums;
    }

    var progressModal = {
        show : function () {
            var self = this;

            self.modal = $('#sharedcoin-modal');

            self.modal.modal({
                keyboard: false,
                backdrop: "static",
                show: true
            });

            self.modal.find('.btn.btn-secondary').unbind().click(function() {
                self.hide();
            });
        },
        setAddressAndAmount : function(address, amount) {
            if (this.modal) {
                this.modal.find('.total_value').text(formatBTC(amount));
                this.modal.find('.address').text(address);
            }
        },
        hide : function() {
            if (this.modal) {
                this.modal.modal('hide');
            }
        },
        disableCancel : function() {
            if (this.modal) {
                this.modal.find('.alert-warning').show();
                this.modal.find('.alert-error').hide();
                this.modal.find('.btn.btn-secondary').prop('disabled', true);
            }
        },
        enableCancel : function() {
            if (this.modal) {
                this.modal.find('.alert-error').show();
                this.modal.find('.alert-warning').hide();
                this.modal.find('.btn.btn-secondary').prop('disabled', false);
            }
        }
    }
    this.newProposal = function() {
        return {
            _pollForCompleted : function(success, error) {
                var self = this;

                console.log('Offer._pollForCompleted()');

                MyWallet.sendEvent("msg", {type: "info", message: 'Waiting For Other Participants To Sign', platform: "iOS"});

                $.retryAjax({
                    dataType: 'json',
                    type: "POST",
                    url: URL,
                    timeout: AjaxTimeout,
                    retryLimit: 4,
                    data : {method : 'poll_for_proposal_completed', format : 'json', proposal_id : self.proposal_id},
                    success: function (obj) {
                        success(obj);
                    },
                    error : function(e) {
                        error(e.responseText);
                    }
                });
            },
            pollForCompleted : function(success, error) {
                var self = this;

                var handleObj = function(obj) {
                    if (obj.status == 'waiting') {
                        self._pollForCompleted(handleObj, error)
                    } else if (obj.status == 'not_found') {
                        error('Proposal ID Not Found');
                    } else if (obj.status == 'complete'){
                        success(obj.tx_hash, obj.tx)
                    } else {
                        error('Unknown status ' + obj.status)
                    }
                }

                self._pollForCompleted(handleObj, error)
            }
        }
    };

    this.newOffer = function() {
        return {
            offered_outpoints : [], //The outpoints we want to offer
            request_outputs : [], //The outputs we want in return
            offer_id : 0, //A unique ID for this offer (set by server)
            fee_percent : BigInteger.ZERO, //The Offer fee percentage
            submit : function(success, error, complete) {
                var self = this;

                MyWallet.sendEvent("msg", {type: "info", message: 'Submitting Offer', platform: "iOS"});

                $.retryAjax({
                    dataType: 'json',
                    type: "POST",
                    url: URL,
                    timeout: AjaxTimeout,
                    retryLimit: 3,
                    data : {method : 'submit_offer', fee_percent : self.fee_percent.toString(), format : 'json', token : SharedCoin.getToken(), offer : JSON.stringify(self)},
                    success: function (obj) {
                        if (obj.status == 'complete') {
                            complete(obj.tx_hash, obj.tx);
                        } else if (!obj.offer_id) {
                            error('Null offer_id returned');
                        } else {
                            self.offer_id = obj.offer_id;
                            success();
                        }
                    },
                    error : function(e) {
                        error(e.responseText);
                    }
                });
            },
            _pollForProposalID : function(success, error) {
                var self = this;

                console.log('Offer._pollForProposalID()');

                MyWallet.sendEvent("msg", {type: "info", message: 'Waiting For Other Participants', platform: "iOS"});

                $.retryAjax({
                    dataType: 'json',
                    type: "POST",
                    url: URL,
                    timeout: AjaxTimeout,
                    retryLimit: 3,
                    data : {method : 'get_offer_id', format : 'json', offer_id : self.offer_id},
                    success: function (obj) {
                        success(obj);
                    },
                    error : function(e) {
                        error(e.responseText);
                    }
                });
            },
            calculateFee : function() {
                var self = this;

                var totalValueInput= BigInteger.ZERO;
                for (var i in self.offered_outpoints) {
                    totalValueInput = totalValueInput.add(BigInteger.valueOf(self.offered_outpoints[i].value));
                }

                var totalValueOutput = BigInteger.ZERO;
                for (var i in self.request_outputs) {
                    totalValueOutput = totalValueOutput.add(BigInteger.valueOf(self.request_outputs[i].value));
                }

                return totalValueInput.subtract(totalValueOutput);
            },
            pollForProposalID : function(success, error) {
                var self = this;

                var handleObj = function(obj) {
                    if (obj.status == 'waiting') {
                        self._pollForProposalID(handleObj, error)
                    } else if (obj.status == 'not_found') {
                        error('Offer ID Not Found');
                    } else if (obj.status == 'active_proposal'){
                        success(obj.proposal_id)
                    }  else {
                        error('Unknown status ' + obj.status)
                    }
                }

                self._pollForProposalID(handleObj, error)
            },
            getProposal : function(proposal_id, success, error, complete) {
                var self = this;

                console.log('SharedCoin.getProposal()');

                MyWallet.sendEvent("msg", {type: "info", message: 'Fetching Proposal', platform: "iOS"});

                $.retryAjax({
                    dataType: 'json',
                    type: "POST",
                    url: URL,
                    timeout: AjaxTimeout,
                    retryLimit: 3,
                    data : {method : 'get_proposal_id', format : 'json', offer_id : self.offer_id, proposal_id : proposal_id},
                    success: function (obj) {

                        var proposal = SharedCoin.newProposal();

                        var clone = jQuery.extend(proposal, obj);

                        if (clone.status == 'not_found') {
                            error('Proposal or Offer ID Not Found');
                        } else if (clone.status == 'complete') {
                            complete(clone.tx_hash, clone.tx);
                        } else if (clone.status == 'signatures_needed') {
                            success(clone);
                        }
                    },
                    error : function(e) {
                        error(e.responseText);
                    }
                });
            },
            isOutpointOneWeOffered : function (input) {
                var self = this;

                var base64Hash = input.outpoint.hash;

                var hexHash = Crypto.util.bytesToHex(Crypto.util.base64ToBytes(base64Hash).reverse());

                var index = input.outpoint.index;

                for (var ii in self.offered_outpoints) {
                    var request_outpoint = self.offered_outpoints[ii];
                    if (request_outpoint.hash.toString() == hexHash.toString() && request_outpoint.index.toString() == index.toString()) {
                        return true;
                    }
                }

                return false;
            },
            isOutputOneWeRequested : function (output) {
                var self = this;

                var array = output.value.slice(0);

                array.reverse();

                var scriptHex = Crypto.util.bytesToHex(output.script.buffer);

                var value = new BigInteger(array);

                for (var ii in self.request_outputs) {
                    var request_output = self.request_outputs[ii];
                    if (request_output.script.toString() == scriptHex.toString() && value.toString() == request_output.value.toString()) {
                        return true;
                    }
                }

                return false;
            },
            isOutputChange : function (output) {
                var self = this;

                var array = output.value.slice(0);

                array.reverse();

                var scriptHex = Crypto.util.bytesToHex(output.script.buffer);

                var value = new BigInteger(array);

                for (var ii in self.request_outputs) {
                    var request_output = self.request_outputs[ii];
                    if (request_output.script.toString() == scriptHex.toString() && value.toString() == request_output.value.toString()) {
                        return request_output.exclude_from_fee;
                    }
                }

                return false;
            },
            determineOutputsToOfferNextStage : function(tx_hex, success, error) {
                var self = this;

                try {
                    var decodedTx = Crypto.util.hexToBytes(tx_hex);

                    var tx = Bitcoin.Transaction.deserialize(decodedTx);

                    var outpoints_to_offer_next_stage = [];

                    for (var i = 0; i < tx.outs.length; ++i) {
                        var output = tx.outs[i];

                        if (self.isOutputOneWeRequested(output)) {
                            if (!self.isOutputChange(output)) {
                                var array = output.value.slice(0);

                                array.reverse();

                                var value = new BigInteger(array);

                                outpoints_to_offer_next_stage.push({hash : null, index : parseInt(i), value : value.toString()});
                            }
                        }
                    }

                    success(outpoints_to_offer_next_stage);

                } catch (e) {
                    error(e);
                }
            },
            checkProposal : function(proposal, success, error) {
                console.log('Offer.checkProposal()');

                var self = this;

                try {
                    if (proposal.tx == null) {
                        throw 'Proposal Transaction Is Null';
                    }

                    var decodedTx = Crypto.util.hexToBytes(proposal.tx);

                    var tx = Bitcoin.Transaction.deserialize(decodedTx);

                    if (tx == null) {
                        throw 'Error deserializing transaction';
                    }

                    var output_matches = 0;
                    for (var i = 0; i < tx.outs.length; ++i) {
                        var output = tx.outs[i];

                        if (self.isOutputOneWeRequested(output)) {
                            ++output_matches;
                        }
                    }

                    if (output_matches < self.request_outputs.length) {
                        throw 'Could not find all our requested outputs (' + output_matches + ' < ' + self.request_outputs.length + ')';
                    }

                    var input_matches = 0;
                    for (var i = 0; i < proposal.signature_requests.length; ++i) {
                        var tx_index = proposal.signature_requests[i].tx_input_index;

                        if (self.isOutpointOneWeOffered(tx.ins[tx_index])) {
                            ++input_matches;
                        }
                    }

                    if (self.offered_outpoints.length != input_matches) {
                        throw 'Could not find all our offered outpoints ('+self.offered_outpoints.length + ' != ' + input_matches + ')';
                    }

                    success(tx);
                } catch (e) {
                    error(e);
                }
            },
            signNormal : function(tx, connected_scripts, success, error) {
                console.log('Offer.signNormal()');

                var index = 0;

                var signatures = [];

                var signOne = function() {
                    setTimeout(function() {
                        try {
                            var connected_script = connected_scripts[index];

                            if (connected_script == null) {
                                throw 'Null connected script';
                            }

                            var signed_script = signInput(tx, connected_script.tx_input_index, connected_script.priv_to_use, connected_script, SIGHASH_ALL);

                            if (signed_script) {
                                index++;

                                signatures.push({tx_input_index : connected_script.tx_input_index, input_script : Crypto.util.bytesToHex(signed_script.buffer), offer_outpoint_index : connected_script.offer_outpoint_index});

                                if (index == connected_scripts.length) {
                                    success(signatures);
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
            },
            submitInputScripts : function(proposal, input_scripts, success, error, complete) {
                console.log('Offer.submitInputScripts()');

                var self = this;

                MyWallet.sendEvent("msg", {type: "info", message: 'Submitting Signatures', platform: "iOS"});

                LastSignatureSubmitTime = new Date().getTime();

                $.retryAjax({
                    dataType: 'json',
                    type: "POST",
                    url: URL,
                    timeout: AjaxTimeout,
                    retryLimit: 3,
                    data : {method : 'submit_signatures', format : 'json', input_scripts : JSON.stringify(input_scripts), offer_id : self.offer_id, proposal_id : proposal.proposal_id},
                    success: function (obj) {
                        if (obj.status == 'not_found')
                            error('Proposal Expired or Not Found');
                        else if (obj.status == 'verification_failed')
                            error('Signature Verification Failed');
                        else if (obj.status == 'complete')
                            complete(obj.tx_hash, obj.tx);
                        else if (obj.status == 'signatures_accepted')
                            success('Signatures Accepted');
                        else
                            error('Unknown status ' + obj.status);
                    },
                    error : function(e) {
                        error(e.responseText);
                    }
                });
            },
            signInputs : function(proposal, tx, success, error) {

                console.log('Offer.signInputs()');

                var self = this;

                try {
                    var tmp_cache = {};

                    var connected_scripts = [];
                    for (var i = 0; i < proposal.signature_requests.length; ++i) {
                        var request = proposal.signature_requests[i];

                        var connected_script = new Bitcoin.Script(Crypto.util.hexToBytes(request.connected_script));

                        if (connected_script == null) {
                            throw 'signInputs() Connected script is null';
                        }

                        connected_script.tx_input_index = request.tx_input_index;
                        connected_script.offer_outpoint_index = request.offer_outpoint_index;

                        var pubKeyHash = connected_script.simpleOutPubKeyHash();
                        var inputAddress = new Bitcoin.Address(pubKeyHash).toString();

                        //Find the matching private key
                        if (tmp_cache[inputAddress]) {
                            connected_script.priv_to_use = tmp_cache[inputAddress];
                        } else if (extra_private_keys[inputAddress]) {
                            connected_script.priv_to_use = Bitcoin.Base58.decode(extra_private_keys[inputAddress]);
                        } else if (MyWallet.legacyAddressExists(inputAddress) && !MyWallet.isWatchOnlyLegacyAddress(inputAddress)) {
                            connected_script.priv_to_use = MyWallet.decodePK(MyWallet.getPrivateKey(inputAddress));
                        }

                        if (connected_script.priv_to_use == null) {
                            throw 'Private key not found';
                        } else {
                            //Performance optimization
                            //Only Decode the key once sand save it in a temporary cache
                            tmp_cache[inputAddress] = connected_script.priv_to_use;
                        }

                        connected_scripts.push(connected_script);
                    }

                    self.signNormal(tx, connected_scripts, function(signatures) {
                        success(signatures);
                    }, function(e) {
                        error(e);
                    });
                } catch (e) {
                    error(e);
                }
            }
        };
    };

    this.generateAddressFromCustomSeed = function(seed, n) {
        var hash = Crypto.SHA256(seed + n, {asBytes: true});

        var key = new Bitcoin.ECKey(hash);

        if (hash[0] % 2 == 0) {
            var address = key.getBitcoinAddress();
        } else {
            var address = key.getBitcoinAddressCompressed();
        }

        extra_private_keys[address.toString()] = Bitcoin.Base58.encode(key.priv);

        return address;
    }

    this.newPlan = function() {
        return {
            offers : [], //Array of Offers for each stage
            n_stages : 0, //Total number of stages
            c_stage : 0, //The current stage
            address_seed  : null,
            address_seen_n : 0,
            generated_addresses : [],
            fee_percent_each_repetition : [],
            fee_each_repetition : [],
            generateAddressFromSeed : function() {

                if (this.address_seed == null) {
                    var array = [];

                    array.length = 18;

                    new SecureRandom().nextBytes(array);

                    this.address_seed = Crypto.util.bytesToHex(array);

                    MyWallet.addAdditionalSeeds(seed_prefix + this.address_seed);
                }

                var address = SharedCoin.generateAddressFromCustomSeed(seed_prefix + this.address_seed,  this.address_seen_n);

                this.address_seen_n++;

                return address;
            },
            generateChangeAddress : function() {
                var key = MyWallet.generateNewKey();

                var change_address = key.getBitcoinAddress();

                this.generated_addresses.push(change_address.toString());

                return change_address;
            },
            executeOffer : function(offer, success, error) {

                function complete(tx_hash, tx) {
                    console.log('executeOffer.complete');

                    offer.determineOutputsToOfferNextStage(tx, function(outpoints_to_offer_next_stage) {
                        //Connect the newly discovered transaction hash
                        for (var i in outpoints_to_offer_next_stage) {
                            outpoints_to_offer_next_stage[i].hash = tx_hash;
                        }

                        success(outpoints_to_offer_next_stage);
                    }, error);
                }

                offer.submit(function() {
                    console.log('Successfully Submitted Offer');

                    offer.pollForProposalID(function(proposal_id) {
                        console.log('Proposal ID ' + proposal_id);

                        offer.getProposal(proposal_id, function(proposal) {
                            console.log('Got Proposal');

                            offer.checkProposal(proposal, function(tx) {
                                console.log('Proposal Looks Good');

                                offer.signInputs(proposal, tx, function(signatures) {
                                    console.log('Inputs Signed');

                                   offer.submitInputScripts(proposal, signatures, function (obj) {
                                        console.log('Submitted Input Scripts');

                                        proposal.pollForCompleted(complete, error);
                                    }, error, complete);
                                }, error);
                            }, error)
                        }, error, complete);
                    }, error);
                }, error, complete);
            },
            execute : function(success, error) {
                var self = this;

                var execStage = function(ii) {
                    self.c_stage = ii;

                    var offerForThisStage = self.offers[ii];

                    console.log('Executing Stage ' + ii);

                    var _success = function(outpoints_to_offer_next_stage) {
                        ii++;

                        if (ii < self.n_stages) {
                            //Connect the outputs created from the previous stage to the inputs to use this stage
                            self.offers[ii].offered_outpoints = outpoints_to_offer_next_stage;

                            execStage(ii);
                        } else if (ii == self.n_stages) {
                            success();
                        }
                    };

                    self.executeOffer(offerForThisStage, _success, function(e) {
                        console.log('executeOffer failed ' + e);

                        setTimeout(function() {
                            self.executeOffer(offerForThisStage, _success, error);
                        }, 5000);
                    });
                };

                MyWallet.backupWallet('update', function() {
                    console.log('Saved Wallet');

                    var additional_seeds = MyWallet.getAdditionalSeeds();

                    var found = false;

                    for (var key in additional_seeds) {
                        var seed = additional_seeds[key];

                        if (seed.indexOf(self.address_seed) >= 0) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        error('Address Seed Not Found');
                    } else {
                        execStage(0);
                    }
                }, error);
            },
            constructRepetitions : function(initial_offer, success, error) {
                try {
                    var self = this;

                    var totalValueInput= BigInteger.ZERO;
                    for (var i in initial_offer.offered_outpoints) {
                        totalValueInput = totalValueInput.add(BigInteger.valueOf(initial_offer.offered_outpoints[i].value));
                    }

                    var totalValueLeftToConsume = totalValueInput;

                    var totalChangeValueLeftToConsume = BigInteger.ZERO;

                    for (var ii = 0; ii < self.n_stages-1; ++ii) {
                        var offer = SharedCoin.newOffer();

                        //Copy the inputs from the last offer
                        if (ii == 0) {
                            for (var i in initial_offer.request_outputs) {
                                if (initial_offer.request_outputs[i].exclude_from_fee) {
                                    var changeoutput = initial_offer.request_outputs.splice(i, 1)[0];

                                    //offer.request_outputs.push(changeoutput);

                                    totalChangeValueLeftToConsume = BigInteger.valueOf(changeoutput.value);

                                    totalValueLeftToConsume = totalValueLeftToConsume.subtract(totalChangeValueLeftToConsume);

                                    break;
                                }
                            }

                            offer.offered_outpoints = initial_offer.offered_outpoints.slice(0);

                            initial_offer.offered_outpoints = [];
                        }

                        offer.fee_percent = self.fee_percent_each_repetition[ii];

                        totalValueLeftToConsume = totalValueLeftToConsume.subtract(self.fee_each_repetition[ii]);

                        var splitValues = [10,5,1,0.5,0.3,0.1];
                        var maxSplits = 8;

                        var rand = Math.random();

                        if (totalValueLeftToConsume.intValue() >= 0.2*satoshi) {
                            var minSplits = 2;
                            if (rand >= 0.5) {
                                minSplits = 3;
                            }
                        } else {
                            var minSplits = 1;
                        }

                        var changeValue = BigInteger.ZERO;
                        var changePercent = 100;//Math.round((Math.random()*60) + 20);

                        if (totalChangeValueLeftToConsume.compareTo(BigInteger.ZERO) < 0) {
                            throw 'totalChangeValueLeftToConsume < 0';
                        } else if (totalChangeValueLeftToConsume.compareTo(BigInteger.ZERO) > 0) {
                            changeValue = totalChangeValueLeftToConsume.divide(BigInteger.valueOf(100)).multiply(BigInteger.valueOf(changePercent));
                        }

                        console.log('changeValue ' + changeValue.toString());

                        if (changeValue.compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValue())) <= 0 || totalChangeValueLeftToConsume.subtract(changeValue).compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValue())) <= 0) {
                            changeValue = totalChangeValueLeftToConsume;
                            totalChangeValueLeftToConsume = BigInteger.ZERO;
                        } else {
                            totalChangeValueLeftToConsume = totalChangeValueLeftToConsume.subtract(changeValue);
                        }

                        if (totalChangeValueLeftToConsume.compareTo(BigInteger.ZERO) < 0) {
                            throw 'totalChangeValueLeftToConsume < 0';
                        }

                        var totalValue = totalValueLeftToConsume.add(totalChangeValueLeftToConsume);

                        var outputsAdded = false;
                        for (var _i = 0; _i < 1000; ++_i) {
                            for (var sK in splitValues) {
                                var variance = (splitValues[sK] / 100) * ((Math.random()*30)-15);

                                var splitValue = BigInteger.valueOf(Math.round((splitValues[sK] + variance) * satoshi));

                                var valueAndRemainder = totalValue.divideAndRemainder(splitValue);

                                var quotient = valueAndRemainder[0].intValue();

                                if (quotient > SharedCoin.getMaximumOfferNumberOfOutputs()) {
                                    continue;
                                }

                                if (quotient >= minSplits && quotient <= maxSplits) {
                                    if (valueAndRemainder[1].compareTo(BigInteger.ZERO) == 0 || valueAndRemainder[1].compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValue())) >= 0) {
                                        var remainderDivides = [];
                                        if (valueAndRemainder[1].compareTo(BigInteger.ZERO) > 0) {
                                            if (quotient <= 1) {
                                                if (valueAndRemainder[1].compareTo(SharedCoin.getMinimumInputValue()) < 0 ||
                                                    valueAndRemainder[1].compareTo(SharedCoin.getMaximumOutputValue()) > 0) {
                                                    continue;
                                                }

                                                var new_address = self.generateAddressFromSeed();

                                                offer.request_outputs.push({
                                                    value : valueAndRemainder[1].toString(),
                                                    script : Crypto.util.bytesToHex(Script.createOutputScript(new_address).buffer)
                                                });
                                            } else {
                                                remainderDivides = divideUniformlyRandomly(valueAndRemainder[1].intValue(), quotient);
                                            }
                                        }

                                        var withinRange = true;
                                        for (var iii  = 0; iii < quotient; ++iii) {

                                            var value = splitValue;
                                            if (remainderDivides[iii] && remainderDivides[iii] > 0) {
                                                value = value.add(BigInteger.valueOf(remainderDivides[iii]));
                                            }

                                            if (value.compareTo(SharedCoin.getMinimumInputValue()) < 0 ||
                                                value.compareTo(SharedCoin.getMaximumOutputValue()) > 0) {
                                                withinRange = false;
                                                break;
                                            }
                                        }

                                        if (!withinRange) {
                                            continue;
                                        }

                                        for (var iii  = 0; iii < quotient; ++iii) {
                                            var new_address = self.generateAddressFromSeed();

                                            var value = splitValue;
                                            if (remainderDivides[iii] && remainderDivides[iii] > 0) {
                                                value = value.add(BigInteger.valueOf(remainderDivides[iii]));
                                            }

                                            offer.request_outputs.push({
                                                value : value.toString(),
                                                script : Crypto.util.bytesToHex(Script.createOutputScript(new_address).buffer)
                                            });
                                        }

                                        outputsAdded = true;

                                        break;
                                    }
                                }
                            }

                            if (outputsAdded)
                                break;
                        }

                        if (!outputsAdded) {
                            var new_address = self.generateAddressFromSeed();

                            offer.request_outputs.push({
                                value : totalValue.toString(),
                                script : Crypto.util.bytesToHex(Script.createOutputScript(new_address).buffer)
                            });
                        }

                        if (changeValue.compareTo(BigInteger.ZERO) > 0) {
                            var change_address = self.generateChangeAddress();

                            if (changeValue.compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValueExcludingFee())) < 0)
                                throw 'Change Value Too Small 0 (' + changeValue.toString() + ' < ' + SharedCoin.getMinimumOutputValueExcludingFee()+ ")";

                            offer.request_outputs.push({
                                value : changeValue.toString(),
                                script : Crypto.util.bytesToHex(Script.createOutputScript(change_address).buffer),
                                exclude_from_fee : true
                            });
                        }

                        self.offers.push(offer);
                    }

                    if (totalChangeValueLeftToConsume.compareTo(BigInteger.ZERO) > 0) {
                        var change_address = self.generateChangeAddress();

                        if (totalChangeValueLeftToConsume.compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValueExcludingFee())) < 0)
                            throw 'Change Value Too Small 1 (' + totalChangeValueLeftToConsume.toString() + ' < ' + SharedCoin.getMinimumOutputValueExcludingFee()+ ")";

                        initial_offer.request_outputs.push({
                            value : totalChangeValueLeftToConsume.toString(),
                            script : Crypto.util.bytesToHex(Script.createOutputScript(change_address).buffer),
                            exclude_from_fee : true
                        });
                    }

                    self.offers.push(initial_offer);

                    success(self);
                } catch (e) {
                    error(e);
                }
            }
        };
    };

    this.getMaximumOfferNumberOfInputs = function() {
        return options.maximum_offer_number_of_inputs;
    }

    this.getMaximumOfferNumberOfOutputs = function() {
        return options.maximum_offer_number_of_outputs;
    }

    this.getMinimumOutputValue = function() {
        return options.minimum_output_value;
    }

    this.getMinimumOutputValueExcludingFee = function() {
        return options.minimum_output_value_exclude_fee;
    }

    this.getToken = function() {
        return options.token;
    }

    this.getMinimumInputValue = function() {
        return options.minimum_input_value;
    }

    this.getMinimumSupportedVersion = function() {
        return options.min_supported_version;
    }

    this.getIsEnabled = function() {
        return options.enabled;
    }

    this.getMaximumOutputValue = function() {
        return options.maximum_output_value;
    }

    this.getFee = function() {
        return options.fee_percent;
    }

    this.getMinimumFee = function() {
        return options.minimum_fee ? options.minimum_fee : 0;
    }

    this.constructPlan = function(el, success, error) {
        try {
            var self = this;

            var repetitionsSelect = el.find('select[name="repetitions"]');

            var donate = el.find('input[name="shared-coin-donate"]').is(':checked');


            console.log('donate ' + donate);

            var repetitions = parseInt(repetitionsSelect.val());

            if (repetitions <= 0) {
                throw 'invalid number of repetitions';
            }

            var plan = SharedCoin.newPlan();

            function _error(e) {
                for (var key in plan.generated_addresses) {
                    MyWallet.deleteLegacyAddress(plan.generated_addresses[key]);
                }

                error(e);
            }

            var newTx = initNewTx();

            //Get the from address, if any
            var from_select = el.find('select[name="from"]');
            var fromval = from_select.val();
            if (fromval == null || fromval == 'any') {
                newTx.from_addresses = MyWallet.getLegacyActiveAddresses();
            } else if (from_select.attr('multiple') == 'multiple') {
                newTx.from_addresses = fromval;
            } else {
                newTx.from_addresses = [fromval];
            }

            var recipients = el.find(".recipient");
            recipients.each(function() {
                try {
                    var child = $(this);

                    var value_input = child.find('input[name="send-value"]');
                    var send_to_input = child.find('input[name="send-to-address"]');

                    var value = 0;
                    try {
                        value = precisionToSatoshiBN(value_input.val());

                        if (value == null || value.compareTo(BigInteger.ZERO) <= 0)
                            throw 'You must enter a value greater than zero';
                    } catch (e) {
                        throw 'Invalid send amount';
                    };

                    //Trim and remove non-printable characters
                    var send_to_address = $.trim(send_to_input.val()).replace(/[\u200B-\u200D\uFEFF]/g, '');

                    if (send_to_address == null || send_to_address.length == 0) {
                        throw 'You must enter a bitcoin address for each recipient';
                    }

                    var address = resolveAddress(send_to_address);

                    if (address == null || address.length == 0) {
                        throw 'You must enter a bitcoin address for each recipient';
                    }

                    var addressObject = new Bitcoin.Address(address);

                    if (addressObject.version != 0) {
                        throw 'Sharedcoin only supports sending payments to regular bitcoin addresses';
                    }

                    newTx.to_addresses.push({address: addressObject, value : value});                    
                } catch (e) {
                    _error(e);
                }
            });

            //Check that we have resolved all to addresses
            if (newTx.to_addresses.length == 0 || newTx.to_addresses.length < recipients.length) {
                return;
            }

            var to_values_before_fees = [];
            var fee_each_repetition = [];
            var fee_percent_each_repetition = [];

            for (var i in newTx.to_addresses) {
                var to_address = newTx.to_addresses[i];

                to_values_before_fees.push(to_address.value);

                for (var ii = repetitions-1; ii >= 0; --ii) {

                    var feePercent = SharedCoin.getFee();

                    if (ii == 0 && donate) {
                        feePercent += DonationPercent;
                    }

                    fee_percent_each_repetition[ii] = feePercent;

                    var feeThisOutput = SharedCoin.calculateFeeForValue(feePercent, to_address.value);

                    to_address.value = to_address.value.add(feeThisOutput);

                    var existing = fee_each_repetition[ii];
                    if (existing) {
                        fee_each_repetition[ii] = existing.add(feeThisOutput);
                    } else {
                        fee_each_repetition[ii] = feeThisOutput;
                    }
                }
            }

            var change_address = plan.generateAddressFromSeed();

            newTx.min_input_confirmations = 1;
            newTx.do_not_use_unspent_cache = true;
            newTx.allow_adjust = false;
            newTx.change_address = change_address;
            newTx.base_fee = BigInteger.ZERO;
            newTx.min_input_size = BigInteger.valueOf(SharedCoin.getMinimumInputValue());
            newTx.min_free_output_size = BigInteger.valueOf(satoshi);
            newTx.fee = BigInteger.ZERO;
            newTx.ask_for_fee = function(yes, no) {
                no();
            };

            var offer = SharedCoin.newOffer();

            newTx.addListener({
                on_error : function(e) {
                    _error();
                }
            });

            newTx.signInputs = function() {
                try {
                    var self = this;

                    if (self.tx.ins.length > SharedCoin.getMaximumOfferNumberOfInputs()) {
                        _error('Maximum number of inputs exceeded. Please consolidate some or lower the send amount');
                        return;
                    }

                    for (var i = 0; i < self.tx.ins.length; ++i) {
                        var input = self.tx.ins[i];

                        var base64Hash = input.outpoint.hash;

                        var hexHash = Crypto.util.bytesToHex(Crypto.util.base64ToBytes(base64Hash).reverse());

                        offer.offered_outpoints.push({hash : hexHash, index : input.outpoint.index, value : input.outpoint.value.toString()});
                    }

                    for (var i = 0; i < self.tx.outs.length; ++i) {
                        var output = self.tx.outs[i];

                        var array = output.value.slice(0);

                        array.reverse();

                        var value = new BigInteger(array);

                        var pubKeyHash = new Bitcoin.Script(output.script).simpleOutPubKeyHash();

                        var outputAddress = new Bitcoin.Address(pubKeyHash).toString();

                        if (outputAddress.toString() == change_address.toString()) {
                            if (value.compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValueExcludingFee())) < 0)
                                throw 'Change Value Too Small 3 (' + value.toString() + ' < ' + SharedCoin.getMinimumOutputValueExcludingFee()+ ")";

                            offer.request_outputs.push({value : value.toString(), script : Crypto.util.bytesToHex(output.script.buffer), exclude_from_fee : true});
                        } else {
                            if (to_values_before_fees[i].compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValue())) < 0)
                                throw 'Output Value Too Small';

                            offer.request_outputs.push({value : to_values_before_fees[i].toString(), script : Crypto.util.bytesToHex(output.script.buffer)});
                        }
                    }

                    plan.n_stages = repetitions;
                    plan.c_stage = 0;
                    plan.fee_each_repetition = fee_each_repetition;
                    plan.fee_percent_each_repetition = fee_percent_each_repetition;

                    plan.constructRepetitions(offer, success, function(e) {
                        _error(e);
                    });

                } catch (e) {
                    _error(e);
                }
            };

            newTx.start();
        } catch (e) {
            _error(e);
        }
    }

    this.calculateFeeForValue = function(fee_percent, input_value) {
        var minFee = BigInteger.valueOf(SharedCoin.getMinimumFee());

        if (input_value.compareTo(BigInteger.ZERO) > 0 && fee_percent > 0) {
            var mod = Math.ceil(100 / fee_percent);

            var fee = input_value.divide(BigInteger.valueOf(mod));

            if (minFee.compareTo(fee) > 0) {
                return minFee;
            } else {
                return fee;
            }
        } else {
            return minFee;
        }
    }

    this.recoverSeeds = function(shared_coin_seeds, success, error) {
        var key = 0;
        var addresses = [];
        function doNext() {
            var seed = shared_coin_seeds[key];

            ++key;

            for (var i = 0; i < 100; ++i) {
                var address = SharedCoin.generateAddressFromCustomSeed(seed, i).toString();
                addresses.push(address);
            }

            if (key == shared_coin_seeds.length) {
                while(addresses.length > 0) {
                    (function(addresses) {
                        BlockchainAPI.get_balances(addresses, function(results) {
                            try {
                                var total_balance = 0;
                                for (var key in results) {
                                    var address = key;
                                    var balance = results[address].final_balance;
                                    if (balance > 0) {
                                        console.log('Balance ' + address + ' = ' + balance);

                                        var ecKey = new Bitcoin.ECKey(Bitcoin.Base58.decode(extra_private_keys[address]));

                                        var uncompressed_address = ecKey.getBitcoinAddress().toString();

                                        try {
                                            if (MyWallet.addPrivateKey(ecKey, {
                                                compressed : address != uncompressed_address,
                                                app_name : IMPORTED_APP_NAME,
                                                app_version : IMPORTED_APP_VERSION
                                            })) {
                                                console.log('Imported ' + address);
                                            }
                                        } catch (e) {
                                            console.log('Error importing ' + address);
                                        }
                                    }
                                    total_balance += balance;
                                }

                                MyWallet.sendEvent("msg", {type: "success", message: formatBTC(total_balance) + ' recovered from intermediate addresses', platform: ""});

                                if (total_balance > 0) {
                                    MyWallet.backupWalletDelayed('update', function() {
                                        MyWallet.get_history();
                                    });
                                }

                                success();
                            } catch (e) {
                                error(e);
                            }
                        }, error);
                    })(addresses.splice(0, 1000));
                }
            } else {
                setTimeout(doNext, 100);
            }
        }
        setTimeout(doNext, 100);
    }

    this.init = function(el) {
        $('#sharedcoin-recover').unbind().click(function() {
            var self = $(this);

            MyWallet.getSecondPassword(function() {
                self.prop('disabled', true);

                var original_text = self.text();

                self.text('Working. Please Wait...');

                var additional_seeds = MyWallet.getAdditionalSeeds();

                var shared_coin_seeds = [];
                for (var key in additional_seeds) {
                    var seed = additional_seeds[key];

                    if (seed.indexOf(seed_prefix) == 0) {
                        shared_coin_seeds.push(seed);
                    }
                }

                SharedCoin.recoverSeeds(shared_coin_seeds, function() {
                    self.prop('disabled', false);
                    self.text(original_text);
                }, function(e) {
                    self.prop('disabled', false);
                    self.text(original_text);
                    MyWallet.sendEvent("msg", {type: "error", message: e, platform: ""});
                });
            });
        });

        var send_button = el.find('.send');
        var send_options = el.find('.send-options');
        var repetitionsSelect = el.find('select[name="repetitions"]');

        send_button.unbind().prop('disabled', true);

        el.find('input[name="send-value"]').bind('keyup change', function() {
            enableSendButton();
        });

        send_options.hide();

        function setSendOptions() {
            var spans = send_options.find('span');

            spans.eq(0).text(formatBTC(SharedCoin.getMaximumOutputValue()));
            spans.eq(1).text(formatBTC(SharedCoin.getMinimumOutputValue()));
            spans.eq(2).text(SharedCoin.getFee());
            spans.eq(3).text(formatBTC(SharedCoin.getMinimumFee()));

            send_options.show();
        }

        function enableSendButton() {
            send_button.unbind();
            var repetitions = parseInt(repetitionsSelect.val());

            if (repetitions > 0 && SharedCoin.getIsEnabled() && version >= SharedCoin.getMinimumSupportedVersion()) {
                var input_value = precisionToSatoshiBN(el.find('input[name="send-value"]').val());

                if (input_value.compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValue())) < 0) {
                    send_button.prop('disabled', true);
                } else if (input_value.compareTo(BigInteger.valueOf(SharedCoin.getMaximumOutputValue())) > 0) {
                    send_button.prop('disabled', true);
                } else {
                    send_button.prop('disabled', false);

                    send_button.unbind().click(function() {
                        MyWallet.disableLogout(true);

                        var error = function(e, plan) {
                            el.find('input,select,button').prop('disabled', false);

                            enableSendButton();

                            MyWallet.disableLogout(false);

                            MyWallet.sendEvent("msg", {type: "error", message: e, platform: ""});

                            setTimeout(function() {
                                if (plan && plan.c_stage >= 0) {
                                    console.log('Recover Seed');
                                    SharedCoin.recoverSeeds([seed_prefix + plan.address_seed], function() {
                                        console.log('Recover Success');
                                    }, function() {
                                        console.log('Recover Error');
                                    });
                                }
                            }, 2000)

                            progressModal.enableCancel();
                        };

                        var success = function(){
                            el.find('input,select,button').prop('disabled', false);

                            MyWallet.sendEvent("msg", {type: "success", message: 'Sharedcoin Transaction Successfully Completed', platform: ""});

                            MyWallet.disableLogout(false);

                            progressModal.hide();

                            enableSendButton();
                        }

                        if (input_value.compareTo(BigInteger.valueOf(SharedCoin.getMinimumOutputValue())) < 0) {
                            MyWallet.sendEvent("msg", {type: "error", message: 'The Minimum Send Value is ' +  formatPrecision(SharedCoin.getMinimumOutputValue()), platform: ""});
                            return;
                        } else if (input_value.compareTo(BigInteger.valueOf(SharedCoin.getMaximumOutputValue())) > 0) {
                            MyWallet.sendEvent("msg", {type: "error", message: 'The Maximum Send Value is ' +  formatPrecision(SharedCoin.getMaximumOutputValue()), platform: ""});
                            return;
                        }

                        MyWallet.getSecondPassword(function() {

                            progressModal.show();

                            progressModal.disableCancel();

                            var value = precisionToSatoshiBN(el.find('input[name="send-value"]').val());
                            var address = el.find('input[name="send-to-address"]').val();

                            progressModal.setAddressAndAmount(address, value);

                            el.find('input,select,button').prop('disabled', true);

                            MyWallet.sendEvent("msg", {type: "info", message: 'Constructing Plan. Please Wait.', platform: "iOS"});

                            var timeSinceLastSubmit = new Date().getTime() - LastSignatureSubmitTime;


                            var interval = Math.max(0, MinTimeBetweenSubmits - timeSinceLastSubmit);

                            if (interval > 0 )
                                $('.loading-indicator').fadeIn(200);

                            setTimeout(function() {
                                $('.loading-indicator').hide();

                                SharedCoin.constructPlan(el, function(plan) {

                                    console.log('Created Plan');

                                    console.log(plan);

                                    plan.execute(success, function(e) {
                                        error(e, plan);
                                    });
                                }, error);
                            }, interval)

                        }, error);
                    });
                }
            } else {
                send_button.prop('disabled', true);
            }
        }

        MyWallet.sendEvent("msg", {type: "info", message: 'Fetching SharedCoin Info', platform: "iOS"});

        $.retryAjax({
            dataType: 'json',
            type: "POST",
            url: URL,
            timeout: AjaxTimeout,
            retryLimit: 3,
            data : {method : 'get_info', format : 'json'},
            success: function (obj) {
                try {
                    options = obj;

                    if (!SharedCoin.getIsEnabled()) {
                        throw 'Shared Coin is currently disabled';
                    }

                    if (version < SharedCoin.getMinimumSupportedVersion()) {
                        throw 'Version out of date. Please update your client or reload the page.';
                    }

                    setSendOptions();

                    repetitionsSelect.empty();

                    for (var ii = obj.recommended_min_iterations; ii <= obj.recommended_max_iterations; ii+=1) {
                        repetitionsSelect.append('<option value="'+(ii)+'">'+(ii)+' Repetitions</option>');
                    }

                    repetitionsSelect.val(obj.recommended_iterations);
                } catch (e) {
                    MyWallet.sendEvent("msg", {type: "error", message: e, platform: ""});
                }

                enableSendButton();
            },
            error : function(e) {
                send_button.prop('disabled', true);
                MyWallet.sendEvent("msg", {type: "error", message: e.responseText, platform: ""});
            }
        });

        enableSendButton();
    }
}