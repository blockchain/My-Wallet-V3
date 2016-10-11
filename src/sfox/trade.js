'use strict';

var assert = require('assert');

var Helpers = require('../exchange/helpers');
var ExchangeTrade = require('../exchange/trade');

class Trade extends ExchangeTrade {
  constructor (obj, api, delegate) {
    super(api, delegate);

    assert(obj, 'JSON missing');
    this._id = obj.id;
    this.set(obj);
  }

  get isBuy () { return this._is_buy; }

  setFromAPI (obj) {
    if ([
      'pending',
      'failed',
      'rejected',
      'completed'
    ].indexOf(obj.status) === -1) {
      console.warn('Unknown status:', obj.status);
    }

    switch (obj.status) {
      case 'pending':
        this._state = 'awaiting_transfer_in';
        break;
      case 'failed':
        this._state = 'failed';
        break;
      default:
        this._state = obj.status;
    }

    this._is_buy = obj.action === 'buy';

    this._inCurrency = obj.quote_currency.toUpperCase();
    this._outCurrency = obj.base_currency.toUpperCase();

    this._sendAmount = this._inCurrency === 'BTC'
      ? Helpers.toSatoshi(obj.quote_amount + obj.fee_amount)
      : Helpers.toCents(obj.quote_amount + obj.fee_amount);

    if (this._inCurrency === 'BTC') {
      this._inAmount = Helpers.toSatoshi(obj.quote_amount);
      this._outAmount = Helpers.toCents(obj.base_amount);
      this._outAmountExpected = Helpers.toCents(obj.base_amount);
    } else {
      this._inAmount = Helpers.toCents(obj.quote_amount);
      this._outAmount = Helpers.toSatoshi(obj.base_amount);
      this._outAmountExpected = Helpers.toSatoshi(obj.base_amount);
    }

    /* istanbul ignore if */
    if (this.debug) {
      console.info('Trade ' + this.id + ' from API');
    }
    // this._createdAt = new Date(obj.createTime); // Pending API change

    if (this._outCurrency === 'BTC') {
      this._txHash = obj.blockchain_tx_hash;
      this._receiveAddress = obj.address;
    }
  }

  setFromJSON (obj) {
    /* istanbul ignore if */
    if (this.debug) {
      console.info('Trade ' + this.id + ' from JSON');
    }
    this._state = obj.state;
    this._is_buy = obj.is_buy;
    this._delegate.deserializeExtraFields(obj, this);
    this._receiveAddress = this._delegate.getReceiveAddress(this);
    this._confirmed = obj.confirmed;
    this._txHash = obj.tx_hash;
  }

  set (obj) {
    if (obj.status) {
      this.setFromAPI(obj);
    } else {
      this.setFromJSON(obj);
    }
    this._medium = 'ach';

    return this;
  }

  static fetchAll (api) {
    return api.authGET('transaction');
  }

  refresh () {
    /* istanbul ignore if */
    if (this.debug) {
      console.info('Refresh ' + this.state + ' trade ' + this.id);
    }
    return this._api.authGET('transaction/' + this._id)
            .then(this.set.bind(this))
            .then(this._delegate.save.bind(this._delegate))
            .then(this.self.bind(this));
  }

  toJSON () {
    var serialized = {
      id: this._id,
      state: this._state,
      tx_hash: this._txHash,
      confirmed: this.confirmed,
      is_buy: this.isBuy
    };

    this._delegate.serializeExtraFields(serialized, this);

    return serialized;
  }

  static filteredTrades (trades) {
    return trades.filter(function (trade) {
      // Only consider transactions that are complete or that we're still
      // expecting payment for:
      return [
        'awaiting_transfer_in',
        'completed',
        'completed_test'
      ].indexOf(trade.state) > -1;
    });
  }

  static buy (quote, medium, paymentMethodId) {
    // const request = (receiveAddress) => {
    //   return quote.api.authPOST('trades', {
    //     priceQuoteId: quote.id,
    //     transferIn: {
    //       medium: medium
    //     },
    //     transferOut: {
    //       medium: 'blockchain',
    //       details: {
    //         account: receiveAddress
    //       }
    //     }
    //   });
    console.log('Go buy', quote.id, paymentMethodId);
    return Promise.resolve({});
    // return super.buy(quote, medium, request);
  }
}

module.exports = Trade;
