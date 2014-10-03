$(document).ready(function () {

    var check_logs_form = $('.check-logs');
    check_logs_form.find('input[name="submit"]').unbind().click(function () {
        var callback_url = $.trim(check_logs_form.find('input[name="callback"]').val());

        if (!callback_url || callback_url.length == 0) {
            $('#initial_success').hide();
            $('#initial_error').show(200).text('You must enter a callback URL');
            return;
        }

        var response_container = check_logs_form.find('.on-callback-response').hide();

        $.get(root + 'api/receive?method=check_logs&cors=true&format=json&callback=' + encodeURIComponent(callback_url),function (response) {
            response_container.empty().show();

            for (var i in response.entries) {
                var entry = response.entries[i];

                var div = $('<div class="well"><b>'+dateToString(new Date(entry.time))+':</b><br /><span></span></div>');

                response_container.append(div);

                div.find('span').text(entry.response);
            }
        }).error(function (e) {
                $('#initial_success').hide();
                $('#initial_error').show(200).text(e.responseText);
            });
    });


    var generate_form = $('.generate-form');

    $('.on-response,.on-callback-url').hide();

    var receiving_address_input = generate_form.find('input[name="receiving_address"]');
    var generate_shared_input = generate_form.find('input[name="generate_shared"]');


    function getCallbackURL() {
        return $.trim(generate_form.find('input[name="generate_callback_url"]').val());
    }

    function generationURL() {
        return root + 'api/receive?method=create&cors=true&format=plain&address=' + encodeURIComponent($.trim(receiving_address_input.val())) + '&shared=' + generate_shared_input.is(':checked') + '&callback=' + encodeURIComponent(getCallbackURL());
    }

    generate_form.find('input').change(function () {
        $('.on-response,.on-callback-url').hide(200);
    });

    generate_form.find('input[name="submit"]').unbind().click(function () {
        $('#initial_success,#initial_error').hide();

        check_logs_form.find('.on-callback-response').hide();

        check_logs_form.find('input[name="callback"]').val(getCallbackURL());

        $.get(generationURL()).success(function (response) {

            if (response.input_address == null) {
                $('.on-response').hide(200);
                $('#initial_success').hide();
                $('#initial_error').show(200).text('Unknown Error');
                return;
            }

            $('.on-response').show(200);

            $('.input_address').text(response.input_address);
            $('.destination').text(response.destination);
            $('.example-response-val').text(JSON.stringify(response));
            $('.example-create-url').text(generationURL());

            $.get(root + 'api/receive?method=get_notification_url&cors=true&format=plain&address=' + encodeURIComponent($.trim(receiving_address_input.val())) + '&callback=' + encodeURIComponent(getCallbackURL()),function (response) {
                $('.real-callback-url').text(response);
                $('.on-callback-url').show(200);
            }).error(function (e) {
                    $('#initial_success').hide();
                    $('#initial_error').show(200).text(e.responseText);
                });

        }).error(function (e) {
                $('.on-response').hide(200);
                $('#initial_success').hide();
                $('#initial_error').show(200).text(e.responseText);
            });
    });

    var callback_form = $('.callback-form');
    callback_form.find('input[name="submit"]').unbind().click(function () {
        $('#initial_success,#initial_error').hide();

        var response_container = callback_form.find('.on-callback-response').hide();

        response_container.hide();

        var generated_url = generationURL();

        $.get(root + 'api/receive?method=test_fire_notification&cors=true&format=plain&address=' + encodeURIComponent($.trim(receiving_address_input.val())) + '&callback=' + encodeURIComponent(getCallbackURL()),function (response) {
            response_container.show(200);

            response_container.find('.callback-response').text(response);
        }).error(function (e) {
                $('#initial_error').show(200).text(e.responseText);
            });
    });
});
