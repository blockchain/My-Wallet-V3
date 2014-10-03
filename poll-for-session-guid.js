var counter = 0;
var isPolling = false;

function pollForSessionGUID() {
    if (isPolling) return;

    isPolling = true;

    console.log('pollForSessionGUID()');

    MyWallet.sendMonitorEvent({type: "info", message: "Waiting For Authorization", code: 0});

    $.ajax({
        dataType: 'json',
        type: "GET",
        url: root + 'wallet/poll-for-session-guid',
        success: function (obj) {
            var self = this;
            if (obj.guid) {
                isPolling = false;

                MyWallet.sendMonitorEvent({type: "success", message: 'Authorization Successful', code: 0});

                MyWallet.setGUID(obj.guid, false);
            } else {
                if (counter < 240) {
                    ++counter;
                    setTimeout(function() {
                        $.ajax(self);
                    }, 2000);
                } else {
                    isPolling = false;
                }
            }
        },
        error : function() {
            isPolling = false;
        }
    });
};
