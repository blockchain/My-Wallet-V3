$(document).ready(function() {
    try {
        //Popovers!
        $("[rel=popover]")
            .popover({
                offset: 10
            })
            .click(function(e) {
                e.preventDefault()
            });
    } catch(err) {}
});
