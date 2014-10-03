isExtension = true;
APP_NAME = 'javascript_blockchain_com_mobile';

$(document).ready(function() {
    var body = $(document.body);

    var data_root = body.data('root');
    if (data_root)
        root = data_root;

    var data_resource = body.data('resource');
    if (data_resource)
        resource = data_resource;

    //Chrome should automatically grant notification permissions
    MyWallet.setHTML5Notifications(true);

    $('#create-account').click(function() {
        Mobile.loadTemplate('create-account')
    });
});

var Mobile = new function() {
    this.loadTemplate = function(name, success, error) {
        $.ajax({
            type: "GET",
            url: '/template',
            data : {format : 'plain', name : name, mobile : true},
            success: function(html) {
                try {
                    $('body').html(html);

                    if (success) success();
                } catch (e) {
                    console.log(e);

                    if (error) error();
                }
            },
            error : function(data) {
                if (error) error();
            }
        });
    }
}