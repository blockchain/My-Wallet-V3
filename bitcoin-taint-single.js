$(document).ready(function() {
    $('#reversed').change(function(){
        $(this).parent().submit();
    });
});