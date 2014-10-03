$(document).ready(function() {
    loadScript('wallet/jquery.qrcode', function() {
        $('#qr-code').qrcode({width: 250, height: 250, text: $(document.body).data('uri')});

        var timer = null;

        function submit() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            setTimeout(function() {
                $('form').submit();
            }, 500);
        }

        $('#amount').on('keyup change', function() {
            $('#amount_local').val(0);
            submit();
        });

        $('#amount_local').on('keyup change', function() {
            $('#amount').val(0);
            submit();
        });
    });
});