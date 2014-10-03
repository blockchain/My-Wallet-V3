function showAddressModalQRCode(address) {
    var modal = $('#qr-code-modal');

    modal.modal({
        keyboard: true,
        backdrop: "static",
        show: true
    });

    loadScript('wallet/jquery.qrcode', function() {
        modal.find('.address-qr-code').empty().qrcode({width: 300, height: 300, text: address});
    });

    modal.find('.address').text(address);

    modal.find('.btn.btn-secondary').unbind().click(function() {
        modal.modal('hide');
    });
}


function verifyMessageModal() {
    var modal = $('#verify-message-modal');

    modal.modal({
        keyboard: true,
        backdrop: "static",
        show: true
    });


    modal.find('.address-result').hide();

    var address_input = modal.find('input[name="address"]');

    var message_textarea = modal.find('textarea[name="message"]');

    var signature_textarea = modal.find('textarea[name="signature"]');

    modal.find('.btn.btn-secondary').unbind().click(function() {
        modal.modal('hide');
    });

    modal.find('textarea').bind('change', function() {
        modal.find('.address-result').hide();
    });

    modal.find('.btn.btn-primary').unbind().click(function() {
        try {
            var address = $.trim(address_input.val());
            if (!address || address.length == 0) {
                throw 'Please enter a Bitcoin Address';
            }

            try {
                Bitcoin.Address.fromBase58Check(address)
            } catch(e) {
                throw 'Invalid Bitcoin Address';
            }

            var message = $.trim(message_textarea.val());
            if (!message || message.length == 0) {
                throw 'You Must Enter A Message To Verify';
            }

            var signature = $.trim(signature_textarea.val());
            if (!signature || signature.length == 0) {
                throw 'You Must Enter A Signature To Verify';
            }

            if (Bitcoin.Message.verify(Bitcoin.Address.fromBase58Check(address), signature, message, Bitcoin.networks.bitcoin))
                modal.find('.address-result-txt').html('<font color="green">Message Successfully Verified</font>');
            else
                modal.find('.address-result-txt').html('<font color="red">Error Verifying Message!</font>');

            modal.find('.address-result').show(200);

        } catch (e) {
            MyWallet.makeNotice('error', 'misc-error', 'Error Verifying Message' + e);
            modal.modal('hide');
            return;
        }
    });
}


function showAddressModalSignMessage(address) {
    MyWallet.getSecondPassword(function() {
        var modal = $('#sign-message-modal');

        modal.modal({
            keyboard: true,
            backdrop: "static",
            show: true
        });

        modal.find('.signature').hide();

        var textarea = modal.find('textarea[name="message"]');

        modal.find('.address').text(address);

        modal.find('.btn.btn-secondary').unbind().click(function() {
            modal.modal('hide');
        });

        textarea.bind('change', function() {
            modal.find('.signature').hide();
        });

        modal.find('.btn.btn-primary').unbind().click(function() {
            var message = $.trim(textarea.val());

            if (!message || message.length == 0) {
                MyWallet.makeNotice('error', 'misc-error', 'You Must Enter A Message To Sign');
                return;
            }

            var signature = MyWallet.signmessage(address, message);

            modal.find('.signature').show(200);

            modal.find('.signature-result').text(signature);
        });
    });
}

function showLabelAddressModal(addr) {
    var modal = $('#label-address-modal');

    modal.modal({
        keyboard: true,
        backdrop: "static",
        show: true
    });

    var label_input = modal.find('input[name="label"]');
    var make_public_input = modal.find('input[name="make_public"]');

    modal.find('.address').text(addr);

    make_public_input.prop('checked', false);

    label_input.val('');

    //Added address book button
    modal.find('.btn.btn-primary').unbind().click(function() {

        modal.modal('hide');

        var label = stripHTML(label_input.val());

        if (label.length == 0) {
            MyWallet.setLabel(addr, null);
            return true;
        }

        if (!/^[\w\-,._  ]+$/.test(label)) {
            MyWallet.makeNotice('error', 'misc-error', 'Label must contain letters and numbers only');
            return false;
        }

        MyWallet.setLabel(addr, label);

        if (make_public_input.is(':checked')) {
            MyWallet.getSecondPassword(function() {

                $.ajax({
                    dataType: 'text',
                    type: "POST",
                    url: root + 'tags',
                    data : {action : 'get_message', format : 'plain'},
                    success : function (response) {
                        var signature = MyWallet.signmessage(addr, response);

                        $.ajax({
                            dataType: 'text',
                            type: "POST",
                            url: root + 'tags',
                            data : {action : 'insert', form_type : 0, address : addr, tag : label, signature : signature, format : 'plain'},
                            error : function (e) {
                                MyWallet.makeNotice('error', 'misc-error', e.responseText);
                            }
                        });
                    },
                    error : function (e) {
                        MyWallet.makeNotice('error', 'misc-error', e.responseText);
                    }
                });
            });
        }

    });

    modal.find('.btn.btn-secondary').unbind().click(function() {
        modal.modal('hide');
    });
}
