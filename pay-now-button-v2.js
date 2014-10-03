

$(document).ready(function() {
    var root = "https://blockchain.info/";
    var buttons = $('.blockchain-btn');

    buttons.find('.blockchain').hide();
    buttons.find('.stage-begin').trigger('show').show();

    buttons.each(function(index) {
        var _button = $(this);

        (function() {
            var button = _button;

            button.click(function() {
                var create_url = $(this).data('create-url');

                button.find('.blockchain').hide();

                button.find('.stage-loading').trigger('show').show();

                $.ajax({
                    type: "GET",
                    dataType: 'json',
                    url: create_url,
                    success: function(response) {
                        button.find('.qr-code').empty();

                        button.find('.blockchain').hide();

                        if (!response || !response.input_address) {
                            button.find('.stage-error').trigger('show').show().html(button.find('.stage-error').html().replace('[[error]]', 'Unknown Error'));
                            return;
                        }

                        function checkBalance() {
                            $.ajax({
                                type: "GET",
                                url: root + 'q/getreceivedbyaddress/'+response.input_address,
                                data : {format : 'plain'},
                                success: function(response) {
                                    if (!response) return;

                                    var value = parseInt(response);

                                    if (value > 0) {
                                        button.find('.blockchain').hide();
                                        button.find('.stage-paid').trigger('show').show().html(button.find('.stage-paid').html().replace('[[value]]', value / 100000000));
                                    } else {
                                        setTimeout(checkBalance, 5000);
                                    }
                                }
                            });
                        }

                        try {
                            ws = new WebSocket('ws://ws.blockchain.info/inv');

                            if (!ws) return;

                            ws.onmessage = function(e) {
                                try {
                                    var obj = $.parseJSON(e.data);

                                    if (obj.op == 'utx') {
                                        var tx = obj.x;

                                        var result = 0;
                                        for (var i = 0; i < tx.out.length; i++) {
                                            var output = tx.out[i];

                                            if (output.addr == response.input_address) {
                                                result += parseInt(output.value);
                                            }
                                        }
                                    }

                                    button.find('.blockchain').hide();
                                    button.find('.stage-paid').trigger('show').show().html(button.find('.stage-paid').html().replace('[[value]]', result / 100000000));

                                    ws.close();
                                } catch(e) {
                                    console.log(e);

                                    console.log(e.data);
                                }
                            };

                            ws.onopen = function() {
                                ws.send('{"op":"addr_sub", "addr":"'+ response.input_address +'"}');
                            };
                        } catch (e) {
                            console.log(e);
                        }

                        button.find('.stage-ready').trigger('show').show().html(button.find('.stage-ready').html().replace('[[address]]', response.input_address));

                        button.find('.qr-code').html('<img style="margin:5px" src="'+root+'qr?data='+response.input_address+'&size=125">');

                        button.unbind();

                        ///Check for incoming payment
                        setTimeout(checkBalance, 5000);
                    },
                    error : function(e) {
                        button.find('.blockchain').hide();

                        button.find('.stage-error').show().trigger('show').html(button.find('.stage-error').html().replace('[[error]]', e.responseText));
                    }
                });
            });
        })();
    });
});