@WalletCrypto = do ->
  supported_encryption_version = 3.0;  # The maxmimum supported encryption version
  
  # Expects an ecrypted secret (e.g. a private key, xpriv or seed hex) and
  # the second password. Returns the secret:
  decryptSecretWithSecondPassword: (secret, password, sharedKey, pbkdf2_iterations) ->
    assert(secret, "secret missing")
    assert(password, "password missing")
    assert(sharedKey, "sharedKey missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")
    
    @decrypt(secret, sharedKey + password, pbkdf2_iterations);
  
  #When the ecryption format changes it can produce data which appears to decrypt fine but actually didn't
  #So we call success(data) and if it returns true the data was formatted correctly

  # Expects a secret (e.g. a private key, xpriv of seed hex) and the second
  # password. Returns the encrypted secret:

  encryptSecretWithSecondPassword: (base58, password, sharedKey, pbkdf2_iterations) ->
    assert(base58, "base58 missing")
    assert(password, "password missing")
    assert(sharedKey, "sharedKey missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")
    
    @encrypt base58, sharedKey + password, pbkdf2_iterations

  decrypt: (data, password, pbkdf2_iterations) ->
    assert(data, "data missing")
    assert(password, "password missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")
    
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
      console.log("Decrypt threw an expection")
      console.log(e)
      # Try another method below if this fails
      
    # Disabled 2015-03-06 by Sjors pending refactoring (salt is undefined here)
    # //iso10126 with 10 iterations  (old default)
    # if (pbkdf2_iterations != 10) {
    #     try {
    #         var streched_password = this.stretchPassword(password, salt, 10);
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
    
    # Last attempt, throws an exception if it fails.
    decoded = CryptoJS.AES.decrypt(data, password,
      mode: CryptoJS.mode.CBC
      padding: CryptoJS.pad.Iso10126
      iterations: 1)
      
    if decoded == null
      throw("Decoding failed")  
    if decoded.length == 0
      throw("Decoding failed")  
      
    decoded
    
  encrypt: (data, password, pbkdf2_iterations) ->
    assert(data, "data missing")
    assert(password, "password missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")
    
    salt = CryptoJS.lib.WordArray.random(16)
    streched_password = @stretchPassword(password, salt, pbkdf2_iterations)
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
    
  # password : will be stetched with pbkdf2_iterations iterations.
  decryptAesWithStretchedPassword: (data, password, pbkdf2_iterations) ->
    assert(data, "data missing")
    assert(password, "password missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")
    
    # Convert base64 string data to hex string
    data_hex_string = CryptoJS.enc.Base64.parse(data).toString()
    # Pull out the Initialization vector from data (@see http://en.wikipedia.org/wiki/Initialization_vector )
    iv = CryptoJS.enc.Hex.parse(data_hex_string.slice(0, 32))
    # We use same value for the PBKDF2 salt and the AES IV. But we do not use a salt in the AES encryption
    salt = iv
    streched_password = @stretchPassword(password, salt, pbkdf2_iterations)
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
    
  encryptWallet: (data, password, pbkdf2_iterations, version) ->
    assert(data, "data missing")
    assert(password, "password missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")
    assert(version, "version missing")
    
    JSON.stringify
      pbkdf2_iterations: pbkdf2_iterations
      version: version
      payload: @encrypt(data, password, pbkdf2_iterations)

  decryptWallet: (data, password, success, error) ->
    assert(data, "data missing")
    assert(password, "password missing")
    assert success, 'Success callback required'
    assert error, 'Error callback required'
    # Determine the wallet version. Version 1 wallets do not have a JSON wrapper.
    walletVersion = null
    if data[0] != '{'
      walletVersion = 1
    else
      obj = null
      try
        obj = $.parseJSON(data)
      catch e
        error 'Failed to parse JSON'
      if obj and obj.payload and obj.pbkdf2_iterations
        walletVersion = obj.version
    if walletVersion > supported_encryption_version
      error 'Wallet version ' + obj.version + ' not supported. Please upgrade to the newest Blockchain Wallet.'
    # Wallet v2+ format: wrapper with pbkdf2 iterations and payload with encrypted data
    if walletVersion >= 2
      try
        decrypted = @decryptAesWithStretchedPassword(obj.payload, password, obj.pbkdf2_iterations)
        root = $.parseJSON(decrypted)
        success root, obj
      catch e
        error 'Error Decrypting Wallet. Please check your password is correct.'
    else
      # TODO legacy format - what should we support here
      # Legacy format: just encrypted data, pbkdf2 iterations can be 10 or maybe 1      
      decrypted = undefined
      try
        decrypted = @decrypt(data, password, 10)
      catch e
        error 'Error Decrypting Wallet. Please check your password is correct.'
        return
      try
        root = $.parseJSON(decrypted)
        success root
      catch e
        error 'Could not parse JSON.'
    return
    
  ###*
  # Reencrypt data with password.
  # The decrypt call uses the currently set number of iterations, the encrypt call uses the new number of iterations we're just setting
  #
  # @param {!string} data The data to encrypt.
  # @param {!string} pw The password used for encryption.
  ###

  reencrypt: (pw, sharedKey, pbkdf2_iterations) ->
    assert(pw, "password missing")
    assert(sharedKey, "password missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")

    enc = (data) ->
      WalletCrypto.encrypt WalletCrypto.decryptSecretWithSecondPassword(data, pw, sharedKey, pbkdf2_iterations), sharedKey + pw, pbkdf2_iterations

    enc
    
  decryptPasswordWithProcessedPin: (data, password, pbkdf2_iterations) ->
    assert(data, "data missing")
    assert(password, "password missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")
    @decryptAesWithStretchedPassword data, password, pbkdf2_iterations

  stretchPassword: (password, salt, pbkdf2_iterations) ->
    assert(salt, "salt missing")
    assert(password, "password missing")
    assert(pbkdf2_iterations, "pbkdf2_iterations missing")
    # Stretch the password using PBKDF2
    # This uses sjcl for speed reasons (order of magnitude faster than CryptoJS using sjcl 1.0.1 vs CryptoJS 3.1.2)
    # sjcl defaults to sha256, but we need sha1 according to rfc 2898

    hmacSHA1 = (key) ->
      hasher = new (sjcl.misc.hmac)(key, sjcl.hash.sha1)

      @encrypt = ->
        hasher.encrypt.apply hasher, arguments

      return

    # need to convert CryptoJS word objects to sjcl word objects
    salt = sjcl.codec.hex.toBits(salt.toString(CryptoJS.enc.Hex))
    streched_password = sjcl.misc.pbkdf2(password, salt, pbkdf2_iterations, 256, hmacSHA1)
    # convert back
    CryptoJS.enc.Hex.parse sjcl.codec.hex.fromBits(streched_password)  