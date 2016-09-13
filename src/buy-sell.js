
module.exports = BuySell;

// var buySell = new Blockchain.BuySell(Blockchain.MyWallet.wallet);
function BuySell (wallet) {
  this._wallet = wallet;

  // Stop if 2nd password is enabled
  if (wallet.external === null) return;

  // Stop if meta data failed to load;
  if (!wallet.external.loaded) {
    return;
  }

  // Add Coinify if not already added:
  if (!this._wallet.external.coinify) this._wallet.external.addCoinify();
}

Object.defineProperties(BuySell.prototype, {
  'status': {
    configurable: false,
    get: function () {
      return {
        metaDataService: this._wallet.external && this._wallet.external.loaded
      };
    }
  },
  'exchanges': {
    configurable: false,
    get: function () {
      if (
        this._wallet.external === null ||
        !this._wallet.external.loaded
      ) return;
      return {
        coinify: this._wallet.external.coinify
      };
    }
  }
});
