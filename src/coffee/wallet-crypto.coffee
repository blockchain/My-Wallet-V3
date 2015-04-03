@WalletCrypto = do ->
  # Expects an ecrypted secret (e.g. a private key, xpriv or seed hex) and
  # the second password. Returns the secret:
  decryptSecretWithSecondPassword: (secret, password, sharedKey) ->
    @decrypt(secret, sharedKey + password, MyWallet.getPbkdf2Iterations(), true);
  
  #When the ecryption format changes it can produce data which appears to decrypt fine but actually didn't
  #So we call success(data) and if it returns true the data was formatted correctly

  # Expects a secret (e.g. a private key, xpriv of seed hex) and the second
  # password. Returns the encrypted secret:

  encryptSecretWithSecondPassword: (base58, password, sharedKey) ->
    @encrypt base58, sharedKey + password, MyWallet.getPbkdf2Iterations()

  decrypt: (data, password, pbkdf2_iterations) ->
    `var decoded`
    #iso10126 with pbkdf2_iterations iterations
    try

      ### This is currently (2014-11-28) the default wallet format. 
       There are two steps to decrypting the wallet. The first step is to
       stretch the users password using PBKDF2. This essentially generates
       an AES key which we need for the second step, which is to decrypt
       the payload using AES.

       Strechting the password requires a salt. AES requires an IV. We use
       the same for both. It's the first 32 hexadecimals characters (i.e.
       16 bytes).

       The conversions between different encodings can probably be achieved
       with fewer methods.
      ###

      decoded = @decryptAesWithStretchedPassword(data, password, pbkdf2_iterations)
      if decoded != null and decoded.length > 0
        return decoded
    catch e
      console.log e
    # Disabled 2015-03-06 by Sjors pending refactoring (salt is undefined here)
    # //iso10126 with 10 iterations  (old default)
    # if (pbkdf2_iterations != 10) {
    #     try {
    #         var streched_password = MyWallet.stretchPassword(password, salt, 10);
    #
    #         var decrypted = CryptoJS.AES.decrypt({ciphertext: payload, salt: ""}, streched_password, { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Iso10126, iv: iv});
    #
    #         var decoded = decrypted.toString(CryptoJS.enc.Utf8);
    #
    #         if (decoded != null && decoded.length > 0) {
    #             if (success(decoded)) {
    #                 return decoded;
    #             };
    #         };
    #     } catch (e) {
    #         console.log(e);
    #     }
    # }
    #Otherwise try the old default settings
    # Disabled by Sjors on 2014-11-26, for lack of test wallet.
    # try {
    #     var decoded = CryptoJS.AES.decrypt(data, password);
    #
    #     if (decoded != null && decoded.length > 0) {
    #         if (success(decoded)) {
    #             return decoded;
    #         };
    #     };
    # } catch (e) {
    #     console.log(e);
    # }
    #OFB iso7816 padding with one iteration (old default)
    # Disabled by Sjors on 2014-11-26, because the current CryptoJS doesn't support iso7816. 
    # try {
    #     var decoded = CryptoJS.AES.decrypt(data, password, {mode: new CryptoJS.mode.OFB(CryptoJS.pad.Iso7816), iterations : 1});
    #
    #     if (decoded != null && decoded.length > 0) {
    #         if (success(decoded)) {
    #             return decoded;
    #         };
    #     };
    # } catch (e) {
    #     console.log(e);
    # }
    #iso10126 padding with one iteration (old default)
    try
      decoded = CryptoJS.AES.decrypt(data, password,
        mode: CryptoJS.mode.CBC
        padding: CryptoJS.pad.Iso10126
        iterations: 1)
      if decoded != null and decoded.length > 0
        return decoded
    catch e
      console.log e
    null
    
  encrypt: (data, password, pbkdf2_iterations) ->
    salt = CryptoJS.lib.WordArray.random(16)
    streched_password = MyWallet.stretchPassword(password, salt, pbkdf2_iterations)
    iv = salt
    # Use the same value for IV and salt.
    payload = CryptoJS.enc.Utf8.parse(data)
    # AES.encrypt takes an optional salt argument, which we don't use.
    encrypted = CryptoJS.AES.encrypt(payload, streched_password,
      mode: CryptoJS.mode.CBC
      padding: CryptoJS.pad.Iso10126
      iv: iv)
    # Add IV to beginning of payload (using hex strings):
    res = iv.toString() + encrypted.ciphertext.toString()
    # Return as Base64:
    CryptoJS.enc.Hex.parse(res).toString CryptoJS.enc.Base64
    
  decryptAesWithStretchedPassword: (data, password, pbkdf2_iterations) ->
    # Convert base64 string data to hex string
    data_hex_string = CryptoJS.enc.Base64.parse(data).toString()
    # Pull out the Initialization vector from data (@see http://en.wikipedia.org/wiki/Initialization_vector )
    iv = CryptoJS.enc.Hex.parse(data_hex_string.slice(0, 32))
    # We use same value for the PBKDF2 salt and the AES IV. But we do not use a salt in the AES encryption
    salt = iv
    streched_password = MyWallet.stretchPassword(password, salt, pbkdf2_iterations)
    # Remove the first 16 bytes (IV) from the payload:
    payload_hex_string = data_hex_string.slice(32)
    # Paylod is cipthertext without IV as bytes
    payload = CryptoJS.enc.Hex.parse(payload_hex_string)
    # AES decryption expects a base 64 encoded payload:
    payload_base_64 = payload.toString(CryptoJS.enc.Base64)
    # AES.decrypt takes an optional salt argument, which we don't use.
    decrypted = CryptoJS.AES.decrypt({
      ciphertext: payload
      salt: ''
    }, streched_password,
      mode: CryptoJS.mode.CBC
      padding: CryptoJS.pad.Iso10126
      iv: iv)
    # Decrypted is returned as bytes, we convert it to a UTF8 String
    decoded = decrypted.toString(CryptoJS.enc.Utf8)
    decoded