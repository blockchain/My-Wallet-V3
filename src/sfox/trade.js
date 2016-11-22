'use strict';

var assert = require('assert');

var Exchange = require('bitcoin-exchange-client');

class Trade extends Exchange.Trade {
  constructor (obj, api, delegate) {
    super(api, delegate);

    assert(obj, 'JSON missing');
    this._id = obj.id.toLowerCase();
    this.set(obj);
  }

  get isBuy () { return this._is_buy; }

  setFromAPI (obj) {
    if ([
      'pending',
      'failed',
      'rejected',
      'completed',
      'ready'
    ].indexOf(obj.status) === -1) {
      console.warn('Unknown status:', obj.status);
    }

    this._sfox_status = obj.status;

    switch (obj.status) {
      case 'pending':
        this._state = 'awaiting_transfer_in';
        break;
      case 'failed':
        this._state = 'failed';
        break;
      case 'ready':
        this._state = 'processing';
        break;
      default:
        this._state = obj.status;
    }

    this._is_buy = obj.action === 'buy';

    this._inCurrency = obj.quote_currency.toUpperCase();
    this._outCurrency = obj.base_currency.toUpperCase();

    this._sendAmount = this._inCurrency === 'BTC'
      ? Exchange.Helpers.toSatoshi(obj.quote_amount + obj.fee_amount)
      : Exchange.Helpers.toCents(obj.quote_amount + obj.fee_amount);

    if (this._inCurrency === 'BTC') {
      this._inAmount = Exchange.Helpers.toSatoshi(obj.quote_amount);
      this._outAmount = Exchange.Helpers.toCents(obj.base_amount);
      this._outAmountExpected = Exchange.Helpers.toCents(obj.base_amount);
    } else {
      this._inAmount = Exchange.Helpers.toCents(obj.quote_amount);
      this._outAmount = Exchange.Helpers.toSatoshi(obj.base_amount);
      this._outAmountExpected = Exchange.Helpers.toSatoshi(obj.base_amount);
    }

    /* istanbul ignore if */
    if (this.debug) {
      console.info('Trade ' + this.id + ' from API');
    }
    this._createdAt = new Date(obj.created_at);

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
    if (Array.isArray(obj)) {
      obj = obj[0];
    }
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
            .then(this._delegate.save.bind(this._delegate));
  }

  // QA tool:
  fakeAchSuccess () {
    let options = { id: this.id };
    return this._api.authPOST('testing/approvedeposit', options)
      .then(this.set.bind(this))
      .then(this._delegate.save.bind(this._delegate));
  }

  // QA tool:
  fakeAchFail () {
    let options = { id: this.id, status: 'rejected' };
    return this._api.authPOST('testing/changestatus', options)
      .then(this.set.bind(this))
      .then(this._delegate.save.bind(this._delegate));
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
    const request = (receiveAddress) => {
      return quote.api.authPOST('transaction', {
        quote_id: quote.id,
        destination: {
          type: 'address',
          address: receiveAddress
        },
        payment_method_id: paymentMethodId
      });
    };
    return super.buy(quote, medium, request);
  }
}

module.exports = Trade;
