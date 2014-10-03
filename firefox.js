min = false;
isExtension = true;
APP_NAME = 'javascript_firefox';

var superSetLanguage = MyWallet.setLanguage;
MyWallet.setLanguage = function(language) {
    if (MyWallet.getLanguage()) {
        superSetLanguage(language);

        MyWallet.makeNotice('success', 'misc-success', 'Changing Language ' + language + '. Please Wait...');

        setTimeout(function() {
            window.location.href = '/blockchain/data/index.html';
        }, 1000);
    } else {
        superSetLanguage(language);
    }
}

var initd = false;
var requests = {};

$.ajax = function(obj) {
    function sendRequest(obj) {

        var customEvent = document.createEvent('Event');

        customEvent.initEvent('ajax_request', true, true);

        if (Object.keys(requests).length == 0) {
            $(document).trigger("ajaxStart");
        }

        var request_id = ''+Math.floor((Math.random()*10000)+1);

        requests[request_id] = obj;

        obj.request_id = request_id;

        console.log('Send Request ID : ' + obj.request_id);

        document.body.setAttribute('data-ajax-request', JSON.stringify(obj));

        document.body.dispatchEvent(customEvent);
    }

    if (!initd) {
        initd = true;

        $(document.body).on('ajax_response', function() {

            console.log(document.body.getAttribute('data-ajax-response'));

            var obj = JSON.parse(document.body.getAttribute('data-ajax-response'));

            console.log('Got Request ID : ' + obj.request_id);

            try {
                var request = requests[obj.request_id];
                if (request == null)  {
                    throw 'Unknown Request ID ' + obj.request_id;
                }

                if (obj.status == 200)  {
                    if (obj.dataType == 'json') {
                        try {
                            request.success(JSON.parse(obj.response));
                        } catch (e) {
                            request.error({responseText : e.toString(), status : obj.status});
                        }
                    } else {
                        request.success(obj.response);
                    }
                } else {
                    request.error({responseText : obj.response, status : obj.status});
                }

                delete requests[obj.request_id];
            } catch (e) {
                console.log(e);
            }

            if (Object.keys(requests).length == 0) {
                $(document).trigger("ajaxStop");
            }
        });
    }

    sendRequest(obj);
};


$(document).ready(function() {

    var body = $(document.body);

    var data_root = body.data('root');
    if (data_root)
        root = data_root;

    var data_resource = body.data('resource');
    if (data_resource) {
        var path = document.location.pathname;
        var index = path.lastIndexOf("/") + 1;
        var filename = path.substr(0, index);

        resource = filename + data_resource;
    }

    $('head').append('<style type="text/css">.external { background: url('+resource+'external.png); }\n span.qrcodeicon span { background: url("'+resource+'qrcode.png"); };</style>');
});