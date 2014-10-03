if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
} else {

    var container = document.getElementById('container');
    var globe = new DAT.Globe(container);
    console.log(globe);
    var i, tweens = [];

    function getData(series) {
        var xhr;

        TWEEN.start();

        xhr = new XMLHttpRequest();
        xhr.open('GET', root + 'nodes-globe?json=' + series, true);
        xhr.onreadystatechange = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var data = JSON.parse(xhr.responseText);
                    window.data = data;
                    var i = 0;
                    for (i = 0; i < data.length; i++) {
                        globe.addData(data[i][1], {
                            format : 'magnitude',
                            name : data[i][0],
                            animated : true
                        });
                    }
                    new TWEEN.Tween(globe).to({time: 0},500).easing(TWEEN.Easing.Cubic.EaseOut).start();

                    globe.createPoints();
                    globe.animate();
                }
            }
        };
        xhr.send(null);
    }

    getData($(document.body).data('series'));
}