/* eslint-disable semi */
class Api {
  constructor (apiKey) {
    this._ssUrl = 'https://shapeshift.io'
    this._apiKey = apiKey
  }

  getRate (pair) {
    return this.request('/marketinfo/' + pair, 'GET')
      .then(res => res.error != null ? Promise.reject(res.error) : (res.success || res))
  }

  getQuote (pair, amount, withdrawal, returnAddress) {
    let apiKey = this._apiKey
    let depositAmount = amount > 0 ? amount.toString() : undefined
    let withdrawalAmount = amount < 0 ? -amount.toString() : undefined
    return this.request('/sendamount', 'POST',
      { pair, withdrawalAmount, depositAmount, withdrawal, returnAddress, apiKey })
      .then(res => res.error != null ? Promise.reject(res.error) : (res.success || res))
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
  }
}

module.exports = Api
