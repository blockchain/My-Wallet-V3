$(document).ready(function() {

    var interval = setInterval(function() {
        $('#restore-password').val($('#restore-password').val() + '-');
    }, 100);

    setTimeout(function () {
        $('#restore-password').val('demoaccountpassword');

        $('#restore-wallet-continue').click();

        clearInterval(interval);

        setTimeout(function() {
            try {
                ws.onmessage({ data : '{"op":"utx","x":{"hash":"b39fe03eb63ad22a8552798530002cbd1e2594b6d917d2db9322f7e26df7fe0b","ver":1,"vin_sz":1,"vout_sz":2,"lock_time":"Unavailable","size":258,"relayed_by":"89.212.41.49","tx_index":'+Math.floor(Math.random()*1001)+',"time":1328804233,"inputs":[{"prev_out":{"value":649324669,"type":0,"addr":"1WzGu3XbGpLcsXgi6WV8iUYVSwroucKce"}}],"out":[{"value":6445699,"type":0,"addr":"1RyNHyyUc5Avnd5VgHaJeGnba1WYCp4XL"},{"value":642828970,"type":0,"addr":"1PkHvfna7fHNi1BnbYjFe5tRDLQZqLYLyz"}]}}' });
            } catch (e) {}
        }, 15000);

        setTimeout(function() {
            try {
                ws.onmessage({ data : '{"op":"utx","x":{"hash":"bc24c7ca43cfe03797d2e60ec3af04354db891bd5bfc666527533257e16f3fed","ver":1,"vin_sz":1,"vout_sz":2,"lock_time":"Unavailable","size":258,"relayed_by":"89.212.41.49","tx_index":'+Math.floor(Math.random()*1001)+',"time":1328804233,"inputs":[{"prev_out":{"value":649324669,"type":0,"addr":"1CZBzQwaVjfqwvRzDPTBDyvwrRYKJs2dis"}}],"out":[{"value":64465699,"type":0,"addr":"1RyNHyyUc5Avnd5VgHaJeGnba1WYCp4XL"},{"value":4542828970,"type":0,"addr":"1HB5XMLmzFVj8ALj6mfBsbifRoD4miY36v"}]}}' });
            } catch (e) {}
        }, 7500);

    }, 2000);

});