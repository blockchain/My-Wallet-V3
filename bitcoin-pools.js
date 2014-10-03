$(document).ready(function() {
    var obj = eval('(' + $(document.body).data('json') + ')');

    var chart = new Highcharts.Chart(obj);
});