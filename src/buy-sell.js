
module.exports = BuySell;

// var buySell = new Blockchain.BuySell(Blockchain.MyWallet.wallet);
function BuySell (wallet, debug) {
  this._wallet = wallet;

  // Stop if 2nd password is enabled
  if (wallet.external === null) {
    console.info("2nd password enabled, don't initialize BuySell");
    return;
  }

  // Stop if meta data failed to load;
  if (wallet.external === null) {
    return;
  }

  this.debug = Boolean(debug);
}

Object.defineProperties(BuySell.prototype, {
  'debug': {
    configurable: false,
    get: function () { return this._debug; },
    set: function (val) {
      this._debug = val;
      this._wallet.external.coinify.debug = val;
      this._wallet.external.sfox.debug = val;

      /* istanbul ignore if */
      if (this.debug) {
        console.info('BuySell debug enabled');
      }
    }
  },
  'status': {
    configurable: false,
    get: function () {
      return {
        metaDataService: this._wallet.external
      };
    }
  },
  'exchanges': {
    configurable: false,
    get: function () {
      if (this._wallet.external === null) return;
      return {
        coinify: this._wallet.external.coinify,
        sfox: this._wallet.external.sfox
      };
    }
  }
});
