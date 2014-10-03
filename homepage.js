
function updateTimes() {
    var now = new Date().getTime() / 1000;
    $('td[data-time]').each(function(index) {
        var time = parseInt($(this).data('time'));

        if (time == 0) $(this).text('');

        var diff = now - time;

        if (diff < 60) {
            $(this).text('< 1 minute');
        } else if (diff < 3600) {
            var p = (parseInt(diff / 60) > 1) ? 's' : '';
            $(this).text(parseInt(diff / 60) + ' minute'+p);
        } else {
            var p = (parseInt(diff / 3600) > 1) ? 's' : '';
            $(this).text(parseInt(diff / 3600) + ' hour'+p+' ' + parseInt((diff % 3600) / 60) + ' minutes');
        }
    });
}

webSocketConnect(function(ws) {
    ws.onmessage = function(e) {

        var obj = $.parseJSON(e.data);

        if (obj.op == 'minitx') {
            var tx = obj.x;

            var label;
            if (tx.tag) {
                label = '<a href="'+root+'tx/'+tx.hash+'" class="tag-address" style="width:85px">'+tx.hash+'</a> <span class="tag">('+tx.tag;

                if (tx.tag_link) {
                    label += ' <a class="external" rel="nofollow" href="'+root+'r?url='+encodeURI(tx.tag_link)+'" target="new"></a>';
                }

                label +=')</span>';
            } else {
                label = '<a href="'+root+'tx/'+tx.hash+'">'+tx.hash.substring(0, 25)+'...</a>';
            }

            var tr = $('<tr><td><div>'+label+'</div></td><td class="hidden-phone" data-time="'+tx.time+'"><div>< 1 minute</div></td><td><div><button class="btn btn-success cb">'+ formatMoney(tx.value, true) +'</button></div></td></tr>');

            tr.insertAfter($('#txs tr:first')).find('div').hide().slideDown('slow');

            $('#txs tr:last-child').remove();
        } else if (obj.op == 'block') {
            var block = BlockFromJSON(obj.x);

            if ($('#bi:'+block.blockIndex).length > 0)
                return;

            var foundByTxt = 'Unknown';
            if (block.foundBy != null) {
                foundByTxt = '<a href="'+block.foundBy.link+'">'+block.foundBy.description+'</a>';
            }

            if (block.txIndex)
                var n_tx = block.txIndex.length;
            else
                var n_tx = 0;

            $('<tr id="bi:'+block.blockIndex+'"><td><div><a href="'+root+'block-index/'+block.blockIndex+'/'+block.hash+'">'+block.height+'</a></div></td><td data-time="'+block.time+'"><div>< 1 minute</div></td><td class="hidden-phone"><div>'+block.txIndex.length+'</div></td><td class="hidden-phone"><div>'+formatMoney(block.totalBTCSent, true)+'</div></td><td><div>'+foundByTxt+'</div></td><td class="hidden-phone"><div>'+parseInt(block.size / 1024)+'</div></td></tr>').insertAfter($('#blocks tr:first')).find('div').hide().slideDown('slow');

            $('#blocks tr:last-child').remove();
        }

        setupSymbolToggle();
    };

    ws.onopen = function() {
        ws.send('{"op":"set_tx_mini"}{"op":"unconfirmed_sub"}{"op":"blocks_sub"}');
    };
});

$(document).ready(function() {

    //Iframe breakout
    if (top.location!= self.location) {
        top.location = self.location.href
    }

    $('#search_button').click(function() {
        document.location = root + 'search/' + document.getElementById('search_input2').value;
        return false;
    });

    setInterval(updateTimes, 1000);
});