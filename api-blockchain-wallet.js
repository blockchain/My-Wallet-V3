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

        $.get(root + 'api/receive?method=check_logs&format=json&callback=' + encodeURIComponent(callback_url),function (response) {

            response_container.empty().show();

            for (var i in response.entries) {
                var entry = response.entries[i];

                var div = $('<div class="well"><b>'+dateToString(new Date(entry.time))+'</b><br /><iframe id="thepage" style="width:800px;height:100px;border-style:none;"></iframe></div>');

                response_container.append(div);

                var iframe = div.find('iframe');

                var iFrameDoc = iframe[0].contentDocument || iframe[0].contentWindow.document;

                iFrameDoc.write(entry.response);

                iFrameDoc.close();
            }
        }).error(function (e) {
                $('#initial_success').hide();
                $('#initial_error').show(200).text(e.responseText);
            });
    });
});