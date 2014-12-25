# Using the same seed and passphrase for two wallets: one without and one with a second password.
seed = "032e2c7c11329737f4b8d1b9076044ed"
passphrase = "add imitate business carbon city orbit spray boss ribbon deposit bachelor sustain"
bip39Password = null

second_password = "1234"
seed_encrypted = "t1vHDdG6LJRAmfj9I3OI6u9hlQAdMIBJ9F82NB9fu2eswp66BT+pqiQl4GSAkqTnq3mr+BBruxTr8acdtAbArQ=="

xpubAccountZero  = "xpub6CcRcFnKD32pPkjV8sVNG4WejGQwQTCaAs31e3NoaFSSnYWfBuEWNo3nKWVZotgtN1dpoYGwSxUVyVfNrrgE7YwpSrUWsqgK2LdmuGDCBMp"
xprivAccountZero = "xprv9yd5CkFRNfUXBGf22qxMtvZvBEaSzzUioe7QqeyC1uuTukBWeMvFpzjJUEDswuWby8JmGR84wQHy75djYEAsAktvJa5B2QueQkzuNQiqS1C"

decryptedWalletPayload = {
	"guid" :      "12345678-1234-1234-1234-1234567890ab",
	"sharedKey" : "87654321-4321-4321-4321-ba0987654321",
	"options" : {
    "pbkdf2_iterations":1,
    "fee_policy":0,
    "html5_notifications":false,
    "logout_time":600000,
    "tx_display":0,
    "always_keep_local_backup":false,
    "transactions_per_page":30,
    "additional_seeds":[]
  },
	"keys" : [
    {"addr":"1M6QyoUiC6Zb1magk2xv2BUg9E6qT1vCAr","label":"Legacy address 1","priv":"G2yMnCQuT5srRmR1rvUzRr9xzTPWGmcN5T2XjarfRdCH","created_time":0,"created_device_name":"external","created_device_version":"0"}
	],
	"address_book" : [
	  {"addr" : "1C26NBkFUc2Et2Ghf3mwPtKYFm2MqGvC7q", "label" : "Friend 1"}
	],
	"tx_notes" : {"9cfb4c8a92ad1ce0ac464132b270f3bb691587f923f48e3bbdf32736d8359309":"Test note","f5c59046e58826ee77ab281c4994b7d7f55bff311ed89fc18cf0b2daae73a90b":"Wow","2e56a0fdcc8567083abb1385c48e0b59f6fc5e6005533c6b49c22932281f87bd":"Flaa   f","3ade266d618ed2c5ab6dfdc1f6c71bad29afd155c1ea48fdef26233a772ca4d5":"AB","2a639e2e927a7d62854d492734cf450d6d07c1779dc6fbe0b763103275bb2d74":"Sent to other wallet","aba107861882b781b433141e1fa5e63312387eb228adcf519d70933440c19de5":"a","af3282da9abfae94573cb0493d59ba15882535b63e04da32c6110b40e8171b82":"Bllll","a44751173217cb0f547176a7e0c5b973548ede1dabfdd65a9e0d6de11e70c3ca":"Bla tea"},
	"tag_names" : [],
	"hd_wallets" : [
	  {
      "seed_hex" : seed,
      "mnemonic_verified" : "false",
      "default_account_idx" : "0",
      "paidTo" : {"af3282da9abfae94573cb0493d59ba15882535b63e04da32c6110b40e8171b82":{"email":"test-email@purpledunes.com","mobile":null,"redeemedAt":1417171978,"address":"1NsGohE53dzWMNFJo2KynFpmDumpBCnFFf"}},
    	"accounts" : [
        {
          "label":"Checking",
          "archived":false,
          "paymentRequests":[
            {"amount":0,"label":"Dog food","paid":0,"complete":false,"index":0}
          ]
          "change_addresses":3,
          "xpriv":xprivAccountZero,
          "xpub":xpubAccountZero
        }
        {
          "label":"Savings",
          "archived":false,
          "paymentRequests":[
          ]
          "change_addresses":0,
          "xpriv":"xprvA13yegr3foPWNkJhJdAQMCAHKuB1BGDSFLTcZSDHkaC89MjKPscWdjMro5HEqB7VYgX88wHff3JEnD2s4DXsM6ZJNi8aX91igFXKcx4t9ga",
          "xpub":"xpub6E3L4CNwWAwobEPAQehQiL71sw1VaiwHcZPDMpcuJuj72A4TwQvmBXgLeKo1NA1WA74XzDmR1vmYF1veqLwMqQYNg1Azv1wxv3yJeVBpxJa"
        }
    	]
  	}
	]
}

decryptedWalletWithSecondPasswordPayload = {
	"guid" :      "12345678-1234-1234-1234-1234567890ab",
	"sharedKey" : "87654321-4321-4321-4321-ba0987654321",
	"options" : {
    "pbkdf2_iterations":1,
    "fee_policy":0,
    "html5_notifications":false,
    "logout_time":600000,
    "tx_display":0,
    "always_keep_local_backup":false,
    "transactions_per_page":30,
    "additional_seeds":[]
    },
	"keys" : [
    {"addr":"1M6QyoUiC6Zb1magk2xv2BUg9E6qT1vCAr","label":"Legacy address 1","priv":"...","created_time":0,"created_device_name":"external","created_device_version":"0"}
	],
	"address_book" : [
	  {"addr" : "1C26NBkFUc2Et2Ghf3mwPtKYFm2MqGvC7q", "label" : "Friend 1"}
	],
	"tx_notes" : {"9cfb4c8a92ad1ce0ac464132b270f3bb691587f923f48e3bbdf32736d8359309":"Test note","f5c59046e58826ee77ab281c4994b7d7f55bff311ed89fc18cf0b2daae73a90b":"Wow","2e56a0fdcc8567083abb1385c48e0b59f6fc5e6005533c6b49c22932281f87bd":"Flaa   f","3ade266d618ed2c5ab6dfdc1f6c71bad29afd155c1ea48fdef26233a772ca4d5":"AB","2a639e2e927a7d62854d492734cf450d6d07c1779dc6fbe0b763103275bb2d74":"Sent to other wallet","aba107861882b781b433141e1fa5e63312387eb228adcf519d70933440c19de5":"a","af3282da9abfae94573cb0493d59ba15882535b63e04da32c6110b40e8171b82":"Bllll","a44751173217cb0f547176a7e0c5b973548ede1dabfdd65a9e0d6de11e70c3ca":"Bla tea"},
	"tag_names" : [],
	"hd_wallets" : [
	  {
      "seed_hex" : "...",
      "mnemonic_verified" : "false",
      "default_account_idx" : "0",
      "paidTo" : {"af3282da9abfae94573cb0493d59ba15882535b63e04da32c6110b40e8171b82":{"email":"test-email@purpledunes.com","mobile":null,"redeemedAt":1417171978,"address":"1NsGohE53dzWMNFJo2KynFpmDumpBCnFFf"}},
    	"accounts" : [
        {
          "label":"Checking",
          "archived":false,
          "paymentRequests":[
            {"amount":0,"label":"Dog food","paid":0,"complete":false,"index":0}
          ]
          "change_addresses":3,
          "xpriv":"izwJDXdLlYAnPVab6mAJ6PAu5mSoQPgL2PHommMsqxkMSnZcZhrONpgvhzyg1BbhTTX4ZCyofoI49MqfM1u0nqBkIHJ5XTRf/Fc4PUBwTdN7E0PEI9/Cr9BpdN8HvZgXV0cK5O51We8zxbAxy8DfwXX4lRskyz+oT/dMUdHMR8Q=",
          "xpub":"xpub6F1cPTmvp4FrWUjDvtdZHJF1MVxdrx3LeSho3NFk6dKRT3x88BqcFbmitM1BuLR9b62yiNbsPHMxCVwZGFBKMzaAKVWbvVYxmXS14pCoxbJ"
        }
        {
          "label":"Savings",
          "archived":false,
          "paymentRequests":[
          ]
          "change_addresses":0,
          "xpriv":"...",
          "xpub":xpubAccountZero
        }
    	]
  	}
	]
}
  

