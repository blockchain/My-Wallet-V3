var assert = require('assert');

class Profile {
  constructor (obj, api) {
    this._api = api;
    this._verification_status = obj.account.verification_status;
    this._limits = obj.account.limits.available;
  }

  get api () { return this._api; }

  get firstName () { return this._firstName; }
  set firstName (val) { this._firstName = val; }

  get middleName () { return this._fullName; }
  set middleName (val) { this._middleName = val; }

  get lastName () { return this._lastName; }
  set lastName (val) { this._lastName = val; }

  get address () {
    return {
      street: {
        line1: this._street1,
        line2: this._street2
      },
      city: this._city,
      state: this._state,
      zipcode: this._zipcode,
      country: this._country
    };
  }

  get dateOfBirth () { return this._dateOfBirth; }
  set dateOfBirth (val) {
    assert(val instanceof(Date), 'Date Object expected');
    this._dateOfBirth = val;
  }

  get identity () {
    return {
      type: this._identityType,
      number: this._identityNumber,
      state: this._identityState,
      country: this._identityCountry
    };
  }

  get verificationStatus () { return this._verification_status; }

  get canBuy () { return this._can_buy; }
  get canSell () { return this._can_sell; }

  get limits () { return this._limits; }

  static fetch (api) {
    return api.authGET('account').then(function (res) {
      var profile = new Profile(res, api);
      return profile;
    });
  }

  setAddress (street1, street2, city, state, zipcode, country) {
    assert(street1 && city && state && zipcode, 'Street, city, state, and zipcode required');
    this._street1 = street1;
    this._street2 = street2;
    this._city = city;
    this._state = state;
    this._zipcode = zipcode;
    this._country = country || 'US';
  }

  setDriversLicense (number, state, country) {
    this._identityType = 'driver_license';
    this._identityNumber = number;
    this._identityState = state || this._state;
    this._identityCountry = country || this._country;
  }

  setPassport (number, state, country) {
    this._identityType = 'passport';
    this._identityNumber = number;
    this._identityState = state || this._state;
    this._identityCountry = country || this._country;
  }

  setSSN (number, state, country) {
    this._identityType = 'ssn';
    this._identityNumber = number;
    this._identityState = state || this._state;
    this._identityCountry = country || this._country;
  }

  verify () {
    assert(this._firstName && this._lastName, 'First and last name required');
    assert(this.address, 'Address required');
    assert(this._dateOfBirth, 'Date of birth required');
    assert(this._identityType, 'Driver license, passport or SSN required');

    return this.api.authPOST('account/verify', {
      firstname: this.firstName,
      middlename: this.middleName || '',
      lastname: this.lastName,
      street1: this.address.street.line1,
      street2: this.address.street.line2 || '',
      city: this.address.city,
      state: this.address.state,
      zipcode: this.address.zipcode,
      country: this.address.country,
      birth_day: this.dateOfBirth.getDate(),
      birth_month: this.dateOfBirth.getMonth(),
      birth_year: this.dateOfBirth.getFullYear(),
      identity: this.identity
    }).then((res) => {
      this._can_buy = res.account.can_buy;
      this._can_sell = res.account.can_sell;
      this._limits = res.account.limits.available;
      this._verification_status = res.account.verification_status;
    });
  }

  getSignedURL (type, filename) {
    return this.api.authPOST('account/uploads/sign', {
      type: type,
      filename: filename
    });
  }
}

module.exports = Profile;
