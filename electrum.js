var default_servers = ['localhost','ecdsa.org'];

var JSONRPCoverHTTP = (function (host, port) {
    var polling_interval = 5000,     // interval at which to poll
        message_id = 0,              // latest message_id for JSONRPC
        unhandled_requests = {},     // in format { 'message_id': {'id', 'method', 'params'}}
        lastSend = 0,                // time of last message
        connected = false,           // true if last message had return status 200
        processing = false,          // true if unhandled_requests was non-empty after last request
        event_handler;               // function set in 'init' to handle messages from server

    port = port || "8081";

    return {
        "init": function (handler) {
            event_handler = handler;
        },

        "isConnected": function () {
            return connected && host;
        },

        "isProcessing": function () {
            return processing;
        },

        "getHost": function () {
            return host;
        },

        "changeHost": function (new_host) {
            if (host != new_host) {
                connected = false;
                unhandled_requests = {};
                lastSend = 0;
                this.onDisconnect("Changing host.");
                host = new_host;
                return true;
            } else {
                return false;
            }
        },

        "poll": function poll() {
            this.send([]);
        },

        "send": function send(messages, onSuccess, onError) {
            var xhr = new XMLHttpRequest(),
                new_unhandled_requests = {},
                that = this;

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {

                        if (!connected) {
                            connected = true;
                            that.onConnect();
                        }

                        // misc.obj_merge(unhandled_requests, new_unhandled_requests);

                        if (xhr.responseText) {
                            var data = JSON.parse(xhr.responseText);

                            if (data.constructor === Array) {
                                for (var i=0; i < data.length; i++) {
                                    that.handle_response(data[i], onSuccess);
                                }
                            } else {
                                that.handle_response(data ,onSuccess)
                            }

                        } else { // !xhr.responseText
                            console.log("Empty response.")
                        }

                        if (misc.obj_size(unhandled_requests)) {
                            console.log("Waiting for responses", misc.obj_keys(unhandled_requests));
                            if (!processing) that.onProcessing();
                            processing = true;
                            polling_interval = 3000;
                        } else {
                            if (processing) that.onIdling();
                            processing = false;
                            polling_interval = 10000;
                        }

                    } else { // xhr.status != 200
                        if (connected) {
                            connected = false;
                            that.onDisconnect("Status != 200.");
                        }
                        for (var v in new_unhandled_requests) {
                            delete unhandled_requests[v];
                        }

                        if (onError) {
                            onError();
                        }
                        polling_interval = 10000;
                    }
                }
            };

            var outgoing = [];

            for (var i = 0; i < messages.length; i++) {
                var m = {
                    "id": message_id,
                    "method": messages[i][0],
                    "params": messages[i][1]
                };

                unhandled_requests[message_id] = m;
                new_unhandled_requests[message_id] = m;
                outgoing.push(m);

                console.log("-->", m['method'], JSON.stringify(m));
                message_id += 1;
            }

            var url = 'http://' + host + ":" + port + '/';
            if (outgoing.length) {
                xhr.open('POST', url, true);
                xhr.send(JSON.stringify(outgoing));
            } else { // !out
                xhr.open('GET', url, true);
                xhr.send();
            }

            lastSend = (new Date()).getTime();
        },

        "go": function go() {
            var that = this;

            setInterval(function () {
                var now = (new Date()).getTime();
                if ((now - lastSend) > polling_interval) {
                    that.poll();
                }
            }, 500);
        },

        "handle_response": function handle_response(r, onSuccess) {
            if ('error' in r) { // it's an error
                console.log("Error " + r['error']['code'] + ": " + r['error']['message']);
            } else if (r['id'] in unhandled_requests) { // it's a response
                r['method'] = unhandled_requests[r['id']]['method'];
                r['params'] = unhandled_requests[r['id']]['params'];
                delete unhandled_requests[r['id']];
                delete r['id'];
            }

            console.log("<--", r['method'], JSON.stringify(r).length > 200 ? r : JSON.stringify(r));

            onSuccess(r);
        },

        "subscribe_to_addrs": function (as) {
            var subscribe_commands = [];
            for (var i = 0; i < as.length; i++) {
                subscribe_commands.push(['blockchain.address.subscribe', [as[i]]]);
            }
            this.send(subscribe_commands);
        },

        "onConnect": function () {

        },

        "onDisconnect": function (reason) {

        },

        "onProcessing": function () {
        },

        "onIdling": function () {
        }
    };
});


var ElectrumAPI = {
    rpc: JSONRPCoverHTTP(default_servers[0]),
    get_history : function () {
        this.rpc.send([["blockchain.address.get_history", [MyWallet.getActiveAddresses()]]], function(response) {
            console.log(response);
        }, function(response) {
            console.log(response);
        });
    }
}

console.log('Load Electrum');

BlockchainAPI.get_history = function(success, error, tx_filter, tx_page) {
    console.log('Get History');

    ElectrumAPI.get_history();
}

