var assert = require('assert');
var Helpers = require('./helpers');

class Exchange {
  constructor (delegate, TradeClass, QuoteClass) {
    assert(delegate, 'ExchangeDelegate required');
    assert(TradeClass, 'Trade class required');
    assert(QuoteClass, 'Quote class required');
    this._delegate = delegate;
    this._trades = [];
    this._TradeClass = TradeClass;
    this._QuoteClass = QuoteClass;
  }

  get debug () { return this._debug; }
  set debug (value) {
    this._debug = Boolean(value);
    this._delegate.debug = Boolean(value);
    for (let trade of this.trades) {
      trade.debug = Boolean(value);
    }
  }

  get user () { return this._user; }

  get autoLogin () { return this._auto_login; }
  set autoLogin (value) {
    assert(
      Helpers.isBoolean(value),
      'Boolean'
    );
    this._auto_login = value;
    this.delegate.save.bind(this.delegate)();
  }

  get trades () { return this._trades; }

  get delegate () { return this._delegate; }

  getBuyQuote (amount, baseCurrency, quoteCurrency) {
    assert(baseCurrency, 'Specify base currency');
    assert(baseCurrency !== 'BTC' || quoteCurrency, 'Specify quote currency');
    if (baseCurrency !== 'BTC') {
      quoteCurrency = 'BTC';
    }
    return this._QuoteClass.getQuote(this._api, this._delegate, -amount, baseCurrency, quoteCurrency, this._debug);
  }

  updateList (list, items, ListClass) {
    var item;
    for (var i = 0; i < items.length; i++) {
      item = undefined;
      for (var k = 0; k < list.length; k++) {
        if (list[k]._id === items[i].id) {
          item = list[k];
          item.debug = this.debug;
          item.set.bind(item)(items[i]);
        }
      }
      if (item === undefined) {
        item = new ListClass(items[i], this._api, this.delegate, this);
        item.debug = this.debug;
        list.push(item);
      }
    }
  }

  getTrades () {
    var save = () => {
      return this.delegate.save.bind(this.delegate)().then(() => this._trades);
    };
    var update = (trades) => {
      this.updateList(this._trades, trades, this._TradeClass);
    };
    var process = () => {
      for (let trade of this._trades) {
        trade.process(this._trades);
      }
    };
    return this._TradeClass.fetchAll(this._api)
                       .then(update)
                       .then(process)
                       .then(save);
  }

  monitorPayments () {
    this._TradeClass.monitorPayments(this._trades, this.delegate);
  }
}

module.exports = Exchange;
