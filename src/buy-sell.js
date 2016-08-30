
module.exports = BuySell;

// var buySell = new Blockchain.BuySell(Blockchain.MyWallet.wallet);
function BuySell (wallet) {
  this._wallet = wallet;

  // Stop if 2nd password is enabled
  if (wallet.external === null) return;

  // Add Coinify if not already added:
  if (!this._wallet.external.coinify) this._wallet.external.addCoinify();
}

Object.defineProperties(BuySell.prototype, {
  'exchanges': {
    configurable: false,
    get: function () {
      if (this._wallet.external === null) return;
      return {
        coinify: this._wallet.external.coinify
      };
    }
  }
});
