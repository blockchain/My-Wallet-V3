/* eslint-disable semi */
class Api {
  constructor (apiKey) {
    this._ssUrl = 'https://shapeshift.io'
    this._apiKey = apiKey
  }

  getRate (pair) {
    return this.request('/marketinfo/' + pair, 'GET')
  }

  getQuote (pair, amount, withdrawal, returnAddress) {
    let apiKey = this._apiKey
    let depositAmount = amount.toString()
    return this.request('/sendamount', 'POST', {
      pair, depositAmount, withdrawal, returnAddress, apiKey
    })
  }

  getTradeStatus (address) {
    return this.request('/txStat/' + address, 'GET')
  }

  request (endpoint, method, data) {
    let body
    let headers = {}

    if (method === 'POST') {
      body = JSON.stringify(data || {})
      headers['Content-Type'] = 'application/json'
    }

    return fetch(this._ssUrl + endpoint, { method, headers, body })
      .then(res => res.status === 200 ? res.json() : res.json().then(e => Promise.reject(e)))
      .then(res => res.error != null ? Promise.reject(res.error) : (res.success || res))
  }
}

module.exports = Api
