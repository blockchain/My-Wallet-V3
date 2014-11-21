
function removeGrouping() {
    $('#active-addresses').trigger('show');
}

function buildTable(groups) {

    var el = $('#active-addresses');
    var table = el.find('table');

    var tbody = table.find('tbody').empty();

    for (var i in groups) {
        var group = groups[i];

        if (i == 0) {

            var tr = $('<tr><th>Group #'+i+'</th><th colspan="2"><a href="#" class="act-hide">Hide Grouping</a></th></tr>');

            (function() {
                tr.find('.act-hide').click(function() {
                    removeGrouping();
                });
            })();

            tbody.append(tr);
        } else {
            tbody.append('<tr><th colspan="3">Group #'+i+'</th></tr>');
        }

        for (var ii in group) {
            var address = group[ii];

            if (!MyWallet.legacyAddressExists(address))
                 continue;

            var noPrivateKey = '';

            if (MyWallet.isWatchOnly(address)) {
                noPrivateKey = ' <font color="red" title="Watch Only">(Watch Only)</font>';
            }

            var extra = '';
            var label = address;
            if (MyWallet.getAddressLabel(address) != null) {
                label = MyWallet.getAddressLabel(address);
                extra = '<span class="hidden-phone"> - ' + address + '</span>';
            }

            var thtml = '<tr style="background-color:#FFFFFF;"><td style="background-color:#FFFFFF;"><div class="short-addr"><a href="'+root+'address/'+address+'" target="new">' + label + '</a>'+ extra + ' ' + noPrivateKey +'<div></td><td style="background-color:#FFFFFF;" colspan="2"><span style="color:green">' + formatBTC(MyWallet.getAddressBalance(address)) + '</span></td></tr>';

            tbody.append(thtml);
        }
    }
}

function loadTaintData() {
    MyWallet.sendMonitorEvent({type: "loadingText", message: 'Loading Taint Data', code: 0});

    var all_addresses = MyWallet.getAllLegacyAddresses();

    $.ajax({
        type: "GET",
        dataType: 'json',
        url: root + 'taint/' + all_addresses.join('|'),
        data : {
            format : 'json'
        },
        success: function(obj) {
            var groups = [];
            var filteredTaints = obj.filteredTaints;

            //For each address in the wallet
            for (var address in filteredTaints) {
                var map =  filteredTaints[address];

                var found = -1;

                //Loop through the addresses which it taints
                for (var tainted_address in map) {
                    var taint = map[tainted_address];

                    for (var i in groups) {
                        //If any address which it taints is already grouped add it to that existing group
                        if (i != found && $.inArray(tainted_address, groups[i])) {

                            //If we already added it two a group and it is found in a new group then we need to merge them
                            if (found >= 0) {
                                var a = groups.splice (found, 1);
                                var b = groups.splice (i, 1);

                                groups.push(a.concat(b));
                            } else {
                                groups[i].push(address);
                            }

                            found = i;
                        }

                        if (found >= 0)
                            break;
                    }
                }

                //If no tainted addresses are found add it to a new group
                if (found == -1)   {
                    groups.push([address]);
                }
            }

            buildTable(groups);

            BlockchainAPI.get_balances(all_addresses, function(obj) {
                buildTable(groups);
            }, function(e) {
                MyWallet.makeNotice('error', 'misc-error', e);
            });
        },
        error : function() {
            MyWallet.makeNotice('error', 'misc-error', 'Error Downloading Taint Data')
        }
    });
 }
