'use strict';

module.exports = CoinifyKYC;

function CoinifyKYC (obj, api) {
  this._api = api;
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
  return this;
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
  return this._api.authGET('kyc/' + this._id).then(this.set.bind(this));
};

CoinifyKYC.trigger = function (api) {
  var processKYC = function (res) {
    var kyc = new CoinifyKYC(res, api);
    return kyc;
  };

  return api.authPOST('traders/me/kyc').then(processKYC);
};

CoinifyKYC.fetchAll = function (api) {
  return api.authGET('kyc');
};
