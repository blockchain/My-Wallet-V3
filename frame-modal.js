
$.fn.center = function () {
    this.css("top", Math.max(( $(window).height() - this.height() ) / 2+$(window).scrollTop(), 10) + "px");
    this.css("left", Math.max(( $(window).width() - this.width() ) / 2+$(window).scrollLeft(), 10) + "px");
    return this;
};

$(window).resize(function() {
    $('.modal:visible').center();
});

function showFrameModal(options) {
    var modal = $('#frame-modal');

    var top_right = '';
    if (options.top_right) {
        top_right = '<span style="float:right;padding-top:5px;padding-right:10px;">'+options.top_right+'</a></span>'
    }

    try {
        modal.modal('hide');

        modal.remove();
    } catch (e) {
        console.log(e);
    }

    var el_name = 'iframe'

    //Special case for chrome extension
    if (APP_NAME == 'javascript_chrome') {
       el_name = 'webview';
    }

    $('body').append('<div id="frame-modal" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button>'+top_right+'<h3>'+options.title+'</h3></div><div class="modal-body" style="overflow-y:hidden;"><'+el_name+' border="0" scrolling="auto" style="overflow-y:hidden;border-style:none;"></'+el_name+'></div><div class="modal-footer btn-group">'+options.description+' <a class="btn btn-secondary">Close</a></div></div>');

    modal = $('#frame-modal');

    modal.modal({
        keyboard: true,
        backdrop: "static",
        show: true
    });


    var frame = modal.find(el_name);

    //For chrome extension
    if (el_name == 'webview') {
        frame.get(0).addEventListener('newwindow', function(e) {
            e.preventDefault();
            window.open(e.targetUrl);
        });

        frame.get(0).addEventListener('permissionrequest', function(e) {
            if (e.permission === 'download') {
                e.request.allow();
            }
        });
    }

    try {
        hidePopovers()
    } catch(e) {};

    if (options.width) {
        modal.find('.modal-body').css('width', options.width);
    }

    if (options.height) {
        frame.css('height', options.height);
    }

    modal.find('.btn.btn-primary').unbind().click(function() {
        modal.modal('hide');
    });

    modal.find('.btn.btn-secondary').unbind().click(function() {
        modal.modal('hide');
    });

    frame.attr('src', options.src);

    modal.center();
}