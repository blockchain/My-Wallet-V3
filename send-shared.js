$(document).ready(function() {

    var forwarding_result = $('#forwarding-result');

    forwarding_result.hide();

    var button = $('#create-forwarding').find('button');

    button.click(function() {
        var self = $(this);

        self.text('Working...').prop('disabled', true);

        var address = $.trim($('#create-forwarding').find('input[name="input-address"]').val());

        $.ajax({
            type: "POST",
            url: root + "forwarder",
            dataType: 'json',
            data : { action : "create-mix", address : address, shared : true},
            success: function(obj) {
                self.text('Create New Forwarding Address').prop('disabled', false);

                if (obj.destination != address) {
                    throw 'Mismatch between requested and returned destination address';
                }

                forwarding_result.show(500);

                forwarding_result.find('.input_address').text(obj.input_address);
                forwarding_result.find('.output_address').text(obj.destination);
                forwarding_result.find('.fee_percent').text(obj.fee_percent);

                $('.bonus,.fee,.free').hide();

                if (obj.fee_percent < 0) {
                    $('.bonus').show();
                }

                if (obj.fee_percent > 0) {
                    $('.fee').show();
                }

                if (obj.fee_percent > 0) {
                    $('.free').show();
                }
            },
            error : function(e) {
                self.text('Create New Forwarding Address').prop('disabled', false);

                alert(e.responseText);
            }
        });
    });

});