$(document).ready(function() {

    var form = $('#reset-two-factor');

    $('#initial_error, #initial_success').hide();

    form.find('button[name="submit"]').unbind().click(function() {
        var guid = $.trim(form.find('input[name="guid"]').val());
        var alias = $.trim(form.find('input[name="alias"]').val());
        var email = $.trim(form.find('input[name="email"]').val());
        var skype_username = $.trim(form.find('input[name="skype_username"]').val());
        var secret_phrase = $.trim(form.find('input[name="secret_phrase"]').val());
        var contact_email = $.trim(form.find('input[name="contact_email"]').val());
        var message = $.trim(form.find('textarea[name="message"]').val());

        $.ajax({
            type: "POST",
            url: root + 'wallet/reset-two-factor',
            data : {
                format : 'plain',
                guid: guid,
                alias: alias,
                email : email,
                skype_username : skype_username,
                secret_phrase : secret_phrase,
                contact_email : contact_email,
                message : message,
                method : 'reset-two-factor'
            },
            success: function(data) {
                $('#initial_error').hide();
                $('#initial_success').show(200).text(data);
            },
            error : function(e) {
                $('#initial_success').hide();
                $('#initial_error').show(200).text(e.responseText);
            }
        });
    });
});