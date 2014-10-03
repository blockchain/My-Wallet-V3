isExtension = true;
APP_NAME = 'javascript_chrome';

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

    $('body').css('padding-bottom', '0px').css('-webkit-user-select', 'text');

    $('html').css('overflow-y', 'auto');

    $('head').append('<style type="text/css"> .modal-backdrop { background-color : rgb(245, 245, 245) }</style>');

    $('.quickstart').css('background-image', 'linear-gradient(rgb(255, 255, 255), rgb(245, 245, 245))').find('.container:first-child').css('padding-top', '0px');

    $('#large-summary').prepend('<img id="refresh" src="'+resource+'refresh-black-32.png" style="padding-bottom:4px" />');

});

MyWallet.makeNotice = function(type, id, msg, timeout) {

    if (msg == null || msg.length == 0)
        return;

    MyWallet.showNotification({
        title : type == 'success' ? 'Success' : 'Error',
        body : msg,
        iconUrl : resource + 'cube48.png'
    });
}

var superSetLanguage = MyWallet.setLanguage;
MyWallet.setLanguage = function(language) {
    if (MyWallet.getLanguage()) {
        superSetLanguage(language);

        MyWallet.makeNotice('success', 'misc-success', 'Changing Language ' + language + '. Please Wait...');

        setTimeout(function() {
            chrome.runtime.reload();
        });
    } else {
        superSetLanguage(language);
    }
}

MyWallet.logout = function() {
    $.ajax({
        type: "GET",
        url: root + 'wallet/logout',
        data : {format : 'plain'},
        success: function(data) {
            chrome.app.window.current().close();
        },
        error : function() {
            chrome.app.window.current().close();
        }
    });
}


MyStore = new function() {
    this.put = function(key, value) {
        var obj = {};

        obj[key] = value;

        try {
            chrome.storage.local.set(obj);
        } catch(e) {
            console.log(e);
        }
    }

    this.get = function(key, callback) {
        try {
            chrome.storage.local.get(key, function(result) {
                try {
                    callback(result[key]);
                } catch (e) {
                    console.log(e);
                }
            });
        } catch(e) {
            console.log(e);
            callback();
        }
    }

    this.remove = function(key) {
        try {
            chrome.storage.local.remove(key);
        } catch(e) {
            console.log(e);
        }
    }

    this.clear = function() {
        try {
            chrome.storage.local.clear();
        } catch(e) {
            console.log(e);
        }
    }
}