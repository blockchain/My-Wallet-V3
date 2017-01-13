'use strict';
const API = require('./api');
const S = {};

S.request = function (method, endpoint, data, authToken) {
  var url = API.API_ROOT_URL + 'metadata/' + endpoint;
  var options = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit'
  };
  if (authToken) {
    options.headers.Authorization = 'Bearer ' + authToken;
  }
  // encodeFormData :: Object -> url encoded params
  var encodeFormData = function (data) {
    if (!data) return '';
    var encoded = Object.keys(data).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
    }).join('&');
    return encoded ? '?' + encoded : encoded;
  };
  if (data && data !== {}) {
    if (method === 'GET') {
      url += encodeFormData(data);
    } else {
      options.body = JSON.stringify(data);
    }
  }
  options.method = method;
  var handleNetworkError = function (e) {
    return Promise.reject({ error: 'SHARED_METADATA_CONNECT_ERROR', message: e });
  };
  var checkStatus = function (response) {
    if (response.ok) {
      return response.json();
    } else {
      return response.text().then(Promise.reject.bind(Promise));
    }
  };
  return fetch(url, options)
    .catch(handleNetworkError)
    .then(checkStatus);
};

// authentication
S.getAuth = () => S.request('GET', 'auth');
S.postAuth = (data) => S.request('POST', 'auth', data);

// messages
S.getMessages = (token, onlyNew) => S.request('GET', 'messages', onlyNew ? {new: true} : {}, token);
S.getMessage = (token, uuid) => S.request('GET', 'message/' + uuid, null, token);
S.sendMessage = (token, recipient, payload, signature, type) =>
  S.request('POST', 'messages', {type, payload, signature, recipient}, token);
S.processMessage = (token, uuid) => S.request('PUT', 'message/' + uuid + '/processed', {processed: true}, token);

// trusted contact list
S.addTrusted = (token, mdid) => S.request('PUT', 'trusted/' + mdid, null, token);
S.getTrusted = (token, mdid) => S.request('GET', 'trusted/' + mdid, null, token);
S.deleteTrusted = (token, mdid) => S.request('DELETE', 'trusted/' + mdid, null, mdid);
S.getTrustedList = (token) => S.request('GET', 'trusted', null, token);

// invitation process
S.createInvitation = (token) => S.request('POST', 'share', null, token);
S.readInvitation = (token, uuid) => S.request('GET', 'share/' + uuid, null, token);
S.acceptInvitation = (token, uuid) => S.request('POST', 'share/' + uuid, null, token);
S.deleteInvitation = (token, uuid) => S.request('DELETE', 'share/' + uuid, null, token);

module.exports = S;
