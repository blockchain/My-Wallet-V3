
module.exports = BuySell;

// var buySell = new Blockchain.BuySell(Blockchain.MyWallet.wallet);
function BuySell (wallet) {
  this._wallet = wallet;

  // Add Coinify if not already added:
  if (!this._wallet.external.coinify) this._wallet.external.addCoinify();
}

Object.defineProperties(BuySell.prototype, {
  'exchanges': {
    configurable: false,
    get: function () {
      return {
        coinify: this._wallet.external.coinify
      };
    }
  }
});
