class API {
  _request (method, url, data, headers) {
    headers = headers || {};

    headers['Content-Type'] = 'application/json';

    var options = {
      headers: headers,
      credentials: 'omit'
    };

    // encodeFormData :: Object -> url encoded params
    var encodeFormData = function (data) {
      var encoded = Object.keys(data).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      }).join('&');
      return encoded;
    };

    if (data && Object.keys(data).length !== 0) {
      if (method === 'GET') {
        url += '?' + encodeFormData(data);
      } else {
        options.body = JSON.stringify(data);
      }
    }

    options.method = method;

    var handleNetworkError = function (e) {
      return Promise.reject({ error: 'EXCHANGE_CONNECT_ERROR', message: e });
    };

    var checkStatus = function (response) {
      if (response.status === 204) {
        return;
      } else if (response.status >= 200 && response.status < 300) {
        return response.json();
      } else {
        return response.text().then(Promise.reject.bind(Promise));
      }
    };

    return fetch(url, options)
      .catch(handleNetworkError)
      .then(checkStatus);
  }
}

module.exports = API;
