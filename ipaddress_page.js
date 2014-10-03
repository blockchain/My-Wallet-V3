
$(document).ready(function() {
    var ip = $(document.body).data('ip');

    webSocketConnect(function(ws) {
        ws.onmessage = function(e) {
            var obj = $.parseJSON(e.data);

            if (obj.op == 'status') {
                $('#status').html(obj.msg);
            } else if (obj.op == 'utx') {

                op = obj.x;

                playSound('beep');

                var tx = TransactionFromJSON(op);

                var tx_html = $(tx.getHTML());

                var container = $('#tx_container');

                container.prepend(tx_html);

                setupSymbolToggle();

                tx_html.hide().slideDown('slow');

                if (container.find('.txdiv').length > 50) {
                    container.find('.txdiv:last-child').remove();
                }

                $('#n_transactions').text(parseInt($('#n_transactions').text())+1);

                calcMoney();
            }
        };

        ws.onopen = function() {
            $('#status').html('Connected. ');

            ws.send('{"op":"ip_sub", "ip":"'+ip+'"}');
        };

        ws.onclose = function() {
            $('#status').html('Disconnected');
        };
    });
});
