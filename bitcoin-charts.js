$(document).ready(function() {
    var jsjson = eval('(' + $(document.body).data('js-json') + ')');

    var chart = new Highcharts.Chart(jsjson);

    var show_header = ($(document.body).data('show-header') == true);

    function setSize() {
        chart.setSize(
            $(document).width() + (show_header ? -40 : 0),
            $(document).height() -40 + (show_header ? -80 : 0),
            false
        );
    }

    setSize();
});