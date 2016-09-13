'use strict';

module.exports = CoinifyKYC;

function CoinifyKYC (obj, coinify) {
  this._coinify = coinify;
  this._id = obj.id;
  this._createdAt = new Date(obj.createTime);
  this.set(obj);
}

CoinifyKYC.prototype.set = function (obj) {
  if ([
    'pending',
    'rejected',
    'declined',
    'failed',
    'expired',
    'completed',
    'completed_test',
    'manualReviewing',
    'manualHold',
    'manualRejected'
  ].indexOf(obj.state) === -1) {
    console.warn('Unknown state:', obj.state);
  }
  this._state = obj.state;
  this._iSignThisID = obj.externalId;
  this._updatedAt = new Date(obj.updateTime);
};

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
      return this._createdAt;
    }
  },
  'updatedAt': {
    configurable: false,
    get: function () {
      return this._updatedAt;
    }
  }
});

CoinifyKYC.prototype.refresh = function () {
  return this._coinify.authGET('kyc/' + this._id).then(this.set.bind(this));
};

CoinifyKYC.trigger = function (coinify) {
  var processKYC = function (res) {
    var kyc = new CoinifyKYC(res, coinify);
    coinify._kycs.push(kyc);
    return kyc;
  };

  return coinify.authPOST('traders/me/kyc').then(processKYC);
};

// Fetches the latest trades and updates coinify._trades
CoinifyKYC.fetchAll = function (coinify) {
  return coinify.authGET('kyc').then(function (res) {
    coinify._kycs.length = 0; // empty array without losing reference
    for (var i = 0; i < res.length; i++) {
      var kyc = new CoinifyKYC(res[i], coinify);
      coinify._kycs.push(kyc);
    }

    return coinify._kycs;
  });
};
