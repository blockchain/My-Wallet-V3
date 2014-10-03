
$(document).ready(function() {
    if ($(document.body).data('admin') == true) {
        $('.tag').editable(root + 'tags?action=update-tag', {
            id   : 'address',
            name : 'tag'
        });
    }

    $("#captcha").attr("src", root + "kaptcha.jpg?timestamp=" + new Date().getTime());
});
