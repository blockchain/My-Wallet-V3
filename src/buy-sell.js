
module.exports = BuySell;

// var buySell = new Blockchain.BuySell(Blockchain.MyWallet.wallet);
function BuySell (wallet, debug) {
  this.debug = Boolean(debug);

  /* istanbul ignore if */
  if (this.debug) {
    console.info('BuySell debug enabled');
  }

  this._wallet = wallet;

  // Stop if 2nd password is enabled
  if (wallet.external === null) {
    /* istanbul ignore if */
    if (this.debug) {
      console.info("2nd password enabled, don't initialize BuySell");
    }
    return;
  }

  // Stop if meta data failed to load;
  if (wallet.external === null) {
    return;
  }

  this._wallet.external.coinify.debug = this.debug;
  this._wallet.external.sfox.debug = this.debug;
}

Object.defineProperties(BuySell.prototype, {
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
