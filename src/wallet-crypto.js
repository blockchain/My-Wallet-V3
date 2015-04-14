var assert = require('assert');

(function() {
  this.WalletCrypto = (function() {
    var supported_encryption_version;
    supported_encryption_version = 3.0;
    return {
      decryptSecretWithSecondPassword: function(secret, password, sharedKey, pbkdf2_iterations) {
        assert(secret, "secret missing");
        assert(password, "password missing");
        assert(sharedKey, "sharedKey missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        return this.decrypt(secret, sharedKey + password, pbkdf2_iterations);
      },
      encryptSecretWithSecondPassword: function(base58, password, sharedKey, pbkdf2_iterations) {
        assert(base58, "base58 missing");
        assert(password, "password missing");
        assert(sharedKey, "sharedKey missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        return this.encrypt(base58, sharedKey + password, pbkdf2_iterations);
      },
      decrypt: function(data, password, pbkdf2_iterations) {
        var decoded, e;
        assert(data, "data missing");
        assert(password, "password missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        try {

          /* This is currently (2014-11-28) the default wallet format. 
           There are two steps to decrypting the wallet. The first step is to
           stretch the users password using PBKDF2. This essentially generates
           an AES key which we need for the second step, which is to decrypt
           the payload using AES.
          
           Strechting the password requires a salt. AES requires an IV. We use
           the same for both. It's the first 32 hexadecimals characters (i.e.
           16 bytes).
          
           The conversions between different encodings can probably be achieved
           with fewer methods.
           */
          decoded = this.decryptAesWithStretchedPassword(data, password, pbkdf2_iterations);
          if (decoded !== null && decoded.length > 0) {
            return decoded;
          }
        } catch (_error) {
          e = _error;
          console.log("Decrypt threw an expection");
          console.log(e);
        }
        decoded = CryptoJS.AES.decrypt(data, password, {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Iso10126,
          iterations: 1
        });
        if (decoded === null) {
          throw "Decoding failed";
        }
        if (decoded.length === 0) {
          throw "Decoding failed";
        }
        return decoded;
      },
      encrypt: function(data, password, pbkdf2_iterations) {
        var encrypted, iv, payload, res, salt, streched_password;
        assert(data, "data missing");
        assert(password, "password missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        salt = CryptoJS.lib.WordArray.random(16);
        streched_password = this.stretchPassword(password, salt, pbkdf2_iterations);
        iv = salt;
        payload = CryptoJS.enc.Utf8.parse(data);
        encrypted = CryptoJS.AES.encrypt(payload, streched_password, {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Iso10126,
          iv: iv
        });
        res = iv.toString() + encrypted.ciphertext.toString();
        return CryptoJS.enc.Hex.parse(res).toString(CryptoJS.enc.Base64);
      },
      decryptAesWithStretchedPassword: function(data, password, pbkdf2_iterations) {
        var data_hex_string, decoded, decrypted, iv, payload, payload_base_64, payload_hex_string, salt, streched_password;
        assert(data, "data missing");
        assert(password, "password missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        data_hex_string = CryptoJS.enc.Base64.parse(data).toString();
        iv = CryptoJS.enc.Hex.parse(data_hex_string.slice(0, 32));
        salt = iv;
        streched_password = this.stretchPassword(password, salt, pbkdf2_iterations);
        payload_hex_string = data_hex_string.slice(32);
        payload = CryptoJS.enc.Hex.parse(payload_hex_string);
        payload_base_64 = payload.toString(CryptoJS.enc.Base64);
        decrypted = CryptoJS.AES.decrypt({
          ciphertext: payload,
          salt: ''
        }, streched_password, {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Iso10126,
          iv: iv
        });
        decoded = decrypted.toString(CryptoJS.enc.Utf8);
        return decoded;
      },
      encryptWallet: function(data, password, pbkdf2_iterations, version) {
        assert(data, "data missing");
        assert(password, "password missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        assert(version, "version missing");
        return JSON.stringify({
          pbkdf2_iterations: pbkdf2_iterations,
          version: version,
          payload: this.encrypt(data, password, pbkdf2_iterations)
        });
      },
      decryptWallet: function(data, password, success, error) {
        var decrypted, e, obj, root, walletVersion;
        assert(data, "data missing");
        assert(password, "password missing");
        assert(success, 'Success callback required');
        assert(error, 'Error callback required');
        walletVersion = null;
        if (data[0] !== '{') {
          walletVersion = 1;
        } else {
          obj = null;
          try {
            obj = $.parseJSON(data);
          } catch (_error) {
            e = _error;
            error('Failed to parse JSON');
          }
          if (obj && obj.payload && obj.pbkdf2_iterations) {
            walletVersion = obj.version;
          }
        }
        if (walletVersion > supported_encryption_version) {
          error('Wallet version ' + obj.version + ' not supported. Please upgrade to the newest Blockchain Wallet.');
        }
        if (walletVersion >= 2) {
          try {
            decrypted = this.decryptAesWithStretchedPassword(obj.payload, password, obj.pbkdf2_iterations);
            root = $.parseJSON(decrypted);
            success(root, obj);
          } catch (_error) {
            e = _error;
            error('Error Decrypting Wallet. Please check your password is correct.');
          }
        } else {
          decrypted = void 0;
          try {
            decrypted = this.decrypt(data, password, 10);
          } catch (_error) {
            e = _error;
            error('Error Decrypting Wallet. Please check your password is correct.');
            return;
          }
          try {
            root = $.parseJSON(decrypted);
            success(root);
          } catch (_error) {
            e = _error;
            error('Could not parse JSON.');
          }
        }
      },

      /**
       * Reencrypt data with password.
       * The decrypt call uses the currently set number of iterations, the encrypt call uses the new number of iterations we're just setting
      #
       * @param {!string} data The data to encrypt.
       * @param {!string} pw The password used for encryption.
       */
      reencrypt: function(pw, sharedKey, previous_pbkdf2_iterations, new_pbkdf2_iterations) {
        var enc;
        assert(pw, "password missing");
        assert(sharedKey, "password missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        enc = function(data) {
          return WalletCrypto.encrypt(WalletCrypto.decryptSecretWithSecondPassword(data, pw, sharedKey, previous_pbkdf2_iterations), sharedKey + pw, new_pbkdf2_iterations);
        };
        return enc;
      },
      decryptPasswordWithProcessedPin: function(data, password, pbkdf2_iterations) {
        assert(data, "data missing");
        assert(password, "password missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        return this.decryptAesWithStretchedPassword(data, password, pbkdf2_iterations);
      },
      stretchPassword: function(password, salt, pbkdf2_iterations) {
        var hmacSHA1, streched_password;
        assert(salt, "salt missing");
        assert(password, "password missing");
        assert(pbkdf2_iterations, "pbkdf2_iterations missing");
        hmacSHA1 = function(key) {
          var hasher;
          hasher = new sjcl.misc.hmac(key, sjcl.hash.sha1);
          this.encrypt = function() {
            return hasher.encrypt.apply(hasher, arguments);
          };
        };
        salt = sjcl.codec.hex.toBits(salt.toString(CryptoJS.enc.Hex));
        streched_password = sjcl.misc.pbkdf2(password, salt, pbkdf2_iterations, 256, hmacSHA1);
        return CryptoJS.enc.Hex.parse(sjcl.codec.hex.fromBits(streched_password));
      }
    };
  })();

}).call(this);

module.exports = WalletCrypto;
