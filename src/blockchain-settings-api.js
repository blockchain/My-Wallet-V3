var BlockchainSettingsAPI = new function() {

  this.get_account_info = function(success, error) {
    MyWallet.securePost("wallet", {method : 'get-info', format : 'json'}, function(data) {
      typeof(success) === "function" && success();

    }, function(data) {
      if (data.responseText)
        MyWallet.sendEvent("msg", {type: "error", message: data.responseText});
      else
        MyWallet.sendEvent("msg", {type: "error", message: 'Error Downloading Account Settings'});

      typeof(error) === "function" &&  error();
    });
  };

  function updateKV(txt, method, value, success, error, extra) {
    value = value.trim();

    extra = extra || '';

    MyWallet.securePost("wallet"+extra, { length : (value+'').length, payload : value+'', method : method }, function(data) {
      MyWallet.sendEvent("msg", {type: "success", message: method + '-success' + data});

      typeof(success) === "function" && success();
    }, function(data) {
      MyWallet.sendEvent("msg", {type: "error", message: method + '-error' + data.responseText});

      typeof(error) === "function" &&  error();
    });
  }

  this.update_API_access = function(enabled, success, error) {
    updateKV('Updating Api Access', 'update-api-access-enabled', enabled ? 1 : 0, success, error);
  };

    /**
   * @param {string} ips Multiple ip addresses should be comma separated. Use % as a wildcard. For example 127.0.0.% to whitelist 127.0.0.1-127.0.0.254.
   * @param {function()} success success callback function
   * @param {function()} error error callback function
   */
  this.update_IP_lock = function(ips, success, error) {
    updateKV('Updating Locked Ip Addresses', 'update-ip-lock', ips, success, error);
  };

  this.update_IP_lock_on = function(enabled, success, error) {
    updateKV('Updating IP Lock', 'update-ip-lock-on', enabled, success, error);
  };

  this.change_language = function(language, success, error) {
    updateKV('Updating Language', 'update-language', language, success, error);
  };

  this.change_local_currency = function(code, success, error) {
    updateKV('Updating Local Currency', 'update-currency', code, success, error);
  };

  this.change_btc_currency = function(code, success, error) {
    updateKV('Updating BTC Currency', 'update-btc-currency', code, success, error);
  };

  this.update_tor_ip_block = function(enabled, success, error) {
    updateKV('Updating TOR ip block', 'update-block-tor-ips', enabled, success, error);
  };

  this.update_password_hint1 = function(value, success, error) {
    updateKV('Updating Main Password Hint', 'update-password-hint1', value, success, error);
  };

  this.update_password_hint2 = function(value, success, error) {
    updateKV('Updating Second Password Hint', 'update-password-hint2', value, success, error);
  };

  this.change_email = function(email, success, error) {
    updateKV('Updating Email', 'update-email', email, success, error);
  };

  this.changeMobileNumber = function(val, success, error) {
    updateKV('Updating Cell Number', 'update-sms', val, success, error);
  };

  this.toggleSave2FA = function(val, success, error) {
    updateKV('Updating Save 2FA', 'update-never-save-auth-type', val, success, error);
  };

  function updateAuthType(val, success, error) {
    updateKV('Updating Two Factor Authentication', 'update-auth-type', val, function() {
      MyWallet.setRealAuthType(val);
      typeof(success) === "function" && success();
    }, error);
  }

  this.unsetTwoFactor = function(success, error) {
    updateAuthType(0, success, error);
  };

  this.setTwoFactorSMS = function(success, error) {
    updateAuthType(5, success, error);
  };

  this.setTwoFactorYubiKey = function(success, error) {
    updateAuthType(3, success, error);
  };

  this.setTwoFactorEmail = function(success, error) {
    updateAuthType(2, success, error);
  };

  this.setTwoFactorGoogleAuthenticator = function(success, error) {
    MyWallet.securePost("wallet", { method : 'generate-google-secret' }, function(google_secret_url) {
      typeof(success) === "function" && success(google_secret_url);
    }, function(data) {
      MyWallet.sendEvent("msg", {type: "error", message: data.responseText});
      typeof(error) === "function" &&  error(data.responseText);
    });
  };

  this.confirmTwoFactorGoogleAuthenticator = function(code, success, error) {
    updateKV('Updating Two Factor Authentication', 'update-auth-type', 4, function() {
      MyWallet.setRealAuthType(4);
      typeof(success) === "function" && success();
    }, error, '?code='+code);
  };

  /**
   * Resend email with verfication code.
   * @param {string} email.
   * @param {function()} success Success callback function.
   * @param {function()} error Error callback function.
   */
  this.resendEmailConfirmation = function(email, success, error) {
    updateKV('Resend Email Confirmation', 'update-email', email, success, error);
  };

  /**
   * Verify email with code.
   * @param {string} code verfication code.
   * @param {function(Object)} success Success callback function.
   * @param {function()} error Error callback function.
   */
  this.verifyEmail = function(code, success, error) {
    MyWallet.securePost("wallet", { payload:code, length : code.length, method : 'verify-email' }, function(data) {
      MyWallet.sendEvent("msg", {type: "success", message: data});
      typeof(success) === "function" && success(data);
    }, function(data) {
      MyWallet.sendEvent("msg", {type: "error", message: data.responseText});
      typeof(error) === "function" &&  error();
    });
  };

  /**
   * Verify mobile with code.
   * @param {string} code verfication code.
   * @param {function(Object)} success Success callback function.
   * @param {function()} error Error callback function.
   */
  this.verifyMobile = function(code, success, error) {
    MyWallet.securePost("wallet", { payload:code, length : code.length, method : 'verify-sms' }, function(data) {
      MyWallet.sendEvent("msg", {type: "success", message: data});
      typeof(success) === "function" && success(data);
    }, function(data) {
      MyWallet.sendEvent("msg", {type: "error", message: data.responseText});
      typeof(error) === "function" &&  error();
    });
  };

};
