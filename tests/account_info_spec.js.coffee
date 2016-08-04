proxyquire = require('proxyquireify')(require)

Helpers = {
  isBoolean: () -> true
}

stubs = {
  './helpers' : Helpers
}

AccountInfo = proxyquire('../src/account-info', stubs)

describe "AccountInfo", ->

  beforeEach ->

  describe "parse get-info", ->
    # Typical result from get-info:
    o =
      btc_currency: "BTC"
      notifications_type: [32]
      language: "nl"
      notifications_on: 2,
      ip_lock_on:0,
      dial_code:"420"
      block_tor_ips:0,
      currency:"EUR"
      notifications_confirmations:0
      auto_email_backup:0
      never_save_auth_type:0
      email: "support@blockchain.info"
      sms_verified:1
      is_api_access_enabled:0,
      auth_type:0
      my_ip: "188.175.127.229"
      email_verified:0
      languages:
        de:"German"
        no:"Norwegian"
        en:"English"
      country_code:"CZ"
      logging_level:0
      guid:"1234"
      ip_lock:"192.168.0.1",
      btc_currencies:
        BTC:"Bitcoin",
        UBC:"Bits (uBTC)"
        MBC:"MilliBit (mBTC)"
      sms_number:"+1 055512345"
      currencies:
        ISK: "Icelandic Króna"
        HKD: "Hong Kong Dollar"
        EUR: "Euro"
        DKK: "Danish Krone"
        USD: "U.S. dollar"

    it "should get email", ->
      i = new AccountInfo(o)
      expect(i.email).toEqual("support@blockchain.info")

    it "should remove space and leading zero from mobile", ->
      i = new AccountInfo(o)
      expect(i.mobile).toEqual("+155512345")

    it "should split mobile into object with country and number", ->
      i = new AccountInfo(o)
      expect(i.mobileObject).toEqual({countryCode: "1", number: "055512345"})

    it "should get email verification status", ->
      i = new AccountInfo(o)
      expect(i.isEmailVerified).toEqual(false)

    it "should update email verification status", ->
      o.email_verified = false
      i = new AccountInfo(o)
      i.isEmailVerified = true
      expect(i.isEmailVerified).toEqual(true)

    it "should get mobile verification status", ->
      i = new AccountInfo(o)
      expect(i.isMobileVerified).toEqual(true)

    it "should get the current country's dial code", ->
      i = new AccountInfo(o)
      expect(i.dialCode).toEqual("420")

    it "should get the users currency", ->
      i = new AccountInfo(o)
      expect(i.currency).toEqual("EUR")

    it "should get the notification status", ->
      i = new AccountInfo(o)
      expect(i.notifications.email).toEqual(false)
      expect(i.notifications.sms).toEqual(true)

    it "should have email notifications enabled", ->
      o.notifications_type = [1]
      i = new AccountInfo(o)
      expect(i.notifications.email).toEqual(true)

    it "should have SMS notifications enabled", ->
      o.notifications_type = [32]
      i = new AccountInfo(o)
      expect(i.notifications.sms).toEqual(true)

    it "should have HTTP notifications enabled", ->
      o.notifications_type = [4]
      i = new AccountInfo(o)
      expect(i.notifications.http).toEqual(true)
