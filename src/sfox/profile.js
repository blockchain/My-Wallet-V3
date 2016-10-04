'use strict';

module.exports = Profile;

function Profile (obj) {
  this._verification_status = obj.account.verification_status.level;
  this._limits = obj.account.limits.available;
}

Object.defineProperties(Profile.prototype, {
  'verificationStatus': {
    configurable: false,
    get: function () {
      return this._verification_status;
    }
  },
  'limits': {
    configurable: false,
    get: function () {
      return this._limits;
    }
  }
});

Profile.fetch = function (api) {
  return api.authGET('account').then(function (res) {
    var profile = new Profile(res);
    return profile;
  });
};
