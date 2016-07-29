'use strict';

module.exports = CoinifyKYC;

function CoinifyKYC (obj, coinify) {
  this._coinify = coinify;

  this._id = obj.id;
  this._state = obj.state;
  this._iSignThisID = obj.externalId;
  this._createdAt = new Date(obj.createTime);
  this._updatedAt = new Date(obj.updateTime);
}

Object.defineProperties(CoinifyKYC.prototype, {
  'id': {
    configurable: false,
    get: function () {
      return this._id;
    }
  },
  'state': {
    configurable: false,
    get: function () {
      return this._state;
    }
  },
  'iSignThisID': {
    configurable: false,
    get: function () {
      return this._iSignThisID;
    }
  },
  'createdAt': {
    configurable: false,
    get: function () {
      return this._created_at;
    }
  },
  'updatedAt': {
    configurable: false,
    get: function () {
      return this._updated_at;
    }
  }
});

CoinifyKYC.trigger = function (coinify) {
  var processKYC = function (res) {
    var kyc = new CoinifyKYC(res, coinify);
    coinify._kycs.push(kyc);
    return kyc;
  };

  return coinify.POST('traders/me/kyc').then(processKYC);
};

// Fetches the latest trades and updates coinify._trades
CoinifyKYC.fetchAll = function (coinify) {
  var getKycs = function () {
    return coinify.GET('kyc').then(function (res) {
      coinify._kycs.length = 0; // empty array without losing reference
      for (var i = 0; i < res.length; i++) {
        var kyc = new CoinifyKYC(res[i], coinify);
        coinify._kycs.push(kyc);
      }

      return coinify._kycs;
    });
  };

  if (coinify.isLoggedIn) {
    return getKycs();
  } else {
    return coinify.login().then(getKycs);
  }
};
