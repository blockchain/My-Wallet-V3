var forwards;

function extendForwarding(input_address) {

    MyWallet.securePost("forwarder", { method : "extend", input_address : input_address, time : 86400000 }, function(data) {
        MyWallet.makeNotice('success', 'misc-success', data);

        buildSharedTable($('#shared-addresses'));
    }, function(data) {
        MyWallet.makeNotice('error', 'misc-error', data.responseText);
    });
}

function buildSharedTable(el) {
    var forward_table = el.find('table');
    var forward_tbody =  forward_table.find('tbody');

    MyWallet.securePost("forwarder", { method : "get", format : 'json'}, function(obj) {
        MyWallet.sendMonitorEvent({type: "loadingText", message: 'Loading Shared Addresses', code: 0});

        forward_tbody.empty();

        forwards = obj.forwards;

        if (forwards && forwards.length > 0 ) {
            for (var i in forwards) {
                var forward = forwards[i];

                var time_left = forward.expires - new Date().getTime();
                function milliToStr(milliseconds) {
                    var seconds = milliseconds / 1000;
                    var numdays = Math.floor((seconds % 31536000) / 86400);
                    if(numdays){
                        return numdays + ' day' + ((numdays > 1) ? 's' : '');
                    }
                    var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
                    if(numhours){
                        return numhours + ' hour' + ((numhours > 1) ? 's' : '');
                    }
                    var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
                    if(numminutes){
                        return numminutes + ' minute' + ((numminutes > 1) ? 's' : '');
                    }
                    return '<font color="red">Pending Deletion</font>'; //'just now' //or other string you like;
                }

                if (MyWallet.legacyAddressExists(forward.destination_address)) {
                    var desintation_desc;

                    if (MyWallet.getLegacyAddressLabel(forward.destination_address))
                        desintation_desc = MyWallet.getLegacyAddressLabel(forward.destination_address);
                    else
                        desintation_desc = forward.destination_address;

                    if (forward.taint < 100) {
                        desintation_desc += ' <font color="green">(Shared)</font>'
                    } else {
                        desintation_desc += ' <small>(Not Shared)</small>';
                    }

                    if (MyWallet.isWatchOnly(forward.destination_address))
                        desintation_desc += ' <font color="red">(Watch Only!)</font>';

                    if (forward.expires == -1)
                        var expires = '<font color="green">Never</font>';
                    else  if (forward.expires == 0)
                        var expires = '<font color="red">6 Confirmations</font>';
                    else
                        var expires = milliToStr(time_left) + ' <a class="pull-right hidden-phone act-extend" href="#">(extend)</a>';

                    var tr = $('<tr><td><a class="short-addr" href="'+root+'address/'+forward.input_address+'" target="new">'+forward.input_address+'</a></td><td class="hidden-phone">'+desintation_desc+'</td><td>'+ expires +'</td></tr>');

                    (function(forward) {
                        tr.find('.act-extend').click(function() {
                            extendForwarding(forward.input_address);
                        });
                    })(forward);

                    forward_tbody.append(tr);
                }
            }
        } else {
            forward_tbody.append('<tr><td colspan="3">No Shared Addresses</td></tr>')
        }

    }, function(data) {
        MyWallet.makeNotice('error', 'misc-error', data.responseText);

        forward_tbody.empty().append('<tr><td colspan="3">No Shared Addresses</td></tr>')
    });


    $('#shared-address').unbind().click(function() {
        var destination = MyWallet.getPreferredAddress();

        MyWallet.sendMonitorEvent({type: "loadingText", message: 'Creating Forwarding Address', code: 0});

        //Default expires is 4 days
        MyWallet.securePost("forwarder", { action : "create-mix", shared : true, address : destination, expires : new Date().getTime()+(345600000), format : 'json'}, function(obj) {
            if (obj.destination != destination) {
                throw 'Mismatch between requested and returned destination address';
            }

            buildSharedTable($('#shared-addresses'));
        }, function(data) {
            MyWallet.makeNotice('error', 'misc-error', data.responseText);
        });
    });
}