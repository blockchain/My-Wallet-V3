function num2dot (ipl) {
    return ( (ipl>>>24) +'.' +
        (ipl>>16 & 255) +'.' +
        (ipl>>8 & 255) +'.' +
        (ipl & 255) );
}

var map;
var prevInterval = 0;
var nextInterval = 0;
var slider_index = 0;
var markersArray = [];
var slider = $('#slider');
var live = true;
var markerCluster = null;
var initial_array = [];
var data_obj = {};

function previous (n) {

    n = Math.min(slider_index, n);
    if (n == 0)
        return;

    for (var i = 0; i < n; i++) {
        markersArray[slider_index-i].setVisible(false);
        markerCluster.removeMarkerAtIndex(slider_index-i);
    }

    markerCluster.resetViewport();

    markerCluster.redraw();

    slider_index -= n;

    $('#slider').slider('value', slider_index);

}

function next (n) {

    if (n+slider_index > markersArray.length)
        return;

    for (var i = 1; i < n+1; i++) {
        if (markersArray[slider_index+i]) {
            markerCluster.addMarker(markersArray[slider_index+i]);
            markersArray[slider_index+i].setVisible(true);
        }
        ++i;
    }

    slider_index += n;

    $('#slider').slider('value', slider_index);
}

webSocketConnect(function (ws) {
    ws.onmessage = function(e) {

        var obj = $.parseJSON(e.data);

        if (obj.op == 'status') {

            $('#status').html(obj.msg);

        } else if (obj.op == 'ir') {

            var time = new Date(obj.inv.t);
            var slider = $('#slider');

            $('#last_seen').html(time.toLocaleString());

            $('#ir').prepend('<tr><td>' + time.toLocaleString() + '</td><td><img src="'+resource+'flags/'+obj.inv.cc.toLowerCase()+'.png" /></td><td> ' + num2dot(obj.inv.ip) + '</td></tr>');

            if (obj.inv.cat == 'MINING_NODE') {
                $('#inv_mining_nodes').append('<li><a href="' + obj.inv.link +'">' + obj.inv.desc + '</a></li>');
            }

            var latLng = new google.maps.LatLng(obj.inv.lat, obj.inv.long);
            var marker = new google.maps.Marker({'position': latLng});

            markersArray.push(marker);

            if (slider.slider('value') > slider.slider("option", "max")-100) {
                slider.slider("option", "max", markersArray.length-1);
                slider.slider('value', markersArray.length-1);
                slider_index = markersArray.length-1;
                markerCluster.addMarker(marker);
            }

            $('#total_relayed').html(markersArray.length);

            $('#p_network').html(Math.round(markersArray.length / data_obj.nconnected * 100) + '%');

        } else if (obj.op == 'tr') {
            for (var i = 0; i < obj.inv.length; ++i) {
                $('#tr').append('<a href="'+root+'ip-address/'+num2dot(obj.inv[i].ip)+'">'+num2dot(obj.inv[i].ip) +'</a> (' + obj.inv[i].x + '%) <br />');
            }
        }
    };

    ws.onopen = function() {
        $('#status').html(data_obj.connected);

        ws.send('{"op":"inv_sub","hash":"'+data_obj.hash+'"}');
    };

    ws.onclose = function() {
        $('#status').html(data_obj.disconnected);
    };
});

$(function() {
    $( "#slider" ).slider({
        min: 0,
        max: 0,
        value: 0,
        slide: function( event, ui ) {

            var value = parseInt(ui.value);

            if (slider_index > value) {
                while (slider_index >= value && slider_index > 0) {
                    markersArray[slider_index].setVisible(false);

                    markerCluster.removeMarkerAtIndex(slider_index);

                    --slider_index;
                }

                markerCluster.resetViewport();

                markerCluster.redraw();
            } else {
                while (slider_index < value && slider_index < markersArray.length-1) {

                    markersArray[slider_index].setVisible(true);

                    markerCluster.addMarker(markersArray[slider_index], false);

                    ++slider_index;
                }
            }

        }
    });
});

$(document).ready(function() {

    data_obj = $(document.body).data('json');

    for (var i in data_obj.initial_relayed) {
        var relay_info = data_obj.initial_relayed[i];
        
        if (relay_info.location) {
            initial_array.push(relay_info.location.lat);
            initial_array.push(relay_info.location.lon);
        }
    }

    var mapOptions = {
        zoom: 3,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        center: new google.maps.LatLng(20, -1)
    };

    map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

    var mcOptions = {gridSize: 30, maxZoom: 6};

    for (var i = initial_array.length-1; i >= 0; i -= 2) {
        var latLng = new google.maps.LatLng(initial_array[i-1], initial_array[i]);
        var marker = new google.maps.Marker({'position': latLng});
        markersArray.push(marker);
    }

    $('#slider').slider("option", "max", markersArray.length-1);
    $('#slider').slider('value', markersArray.length-1);
    slider_index = markersArray.length-1;

    markerCluster = new MarkerClusterer(map, markersArray, mcOptions);

    $("#previous").mouseup(function(){
        clearInterval ( prevInterval );
    }).mousemove(function(e) {
            clearInterval ( prevInterval );
        }).mousedown(function(){
            previous(1);
            prevInterval = setInterval ("previous(20)", 250 );
        });

    $("#next").mouseup(function(){
        clearInterval ( nextInterval );
    }).mousemove(function(e) {
            clearInterval ( nextInterval );
        }).mousedown(function(){
            next(1);
            nextInterval = setInterval ("next(10)", 100 );
        });
});
