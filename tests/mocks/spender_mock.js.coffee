Bitcoin = require('bitcoinjs-lib');

global.spenderM = {}

################################################################################
# Addres to Address payment mock

spenderM.addToAdd = {}
spenderM.addToAdd.coins = 'unspent_outputs': [
    {
      'tx_hash': 'c971328f18336dbc6961c35378a9fa53561571357e8f8c1793fe2d4075f12af4'
      'tx_hash_big_endian': 'f42af175402dfe93178c8f7e3571155653faa97853c36169bc6d33188f3271c9'
      'tx_index': 85110550
      'tx_output_n': 1
      'script': '76a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac'
      'value': 40000
      'value_hex': '009c40'
      'confirmations': 267
      'hash': 'f42af175402dfe93178c8f7e3571155653faa97853c36169bc6d33188f3271c9'
      'index': 1
    }
    {
      'tx_hash': '6876d0264ed25aa69b30cda92020f7d7e78ae611be91368c843dfb27139fb45a'
      'tx_hash_big_endian': '5ab49f1327fb3d848c3691be11e68ae7d7f72020a9cd309ba65ad24e26d07668'
      'tx_index': 85114355
      'tx_output_n': 0
      'script': '76a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac'
      'value': 30000
      'value_hex': '7530'
      'confirmations': 262
      'hash': '5ab49f1327fb3d848c3691be11e68ae7d7f72020a9cd309ba65ad24e26d07668'
      'index': 0
    }
  ]
# encrypted with password "hola"
spenderM.addToAdd.encPrivateKey = "6lzfKSFi/9xkli8eRaPDoyHDkaBzRWKdWEamoMvsmJptnhwPZzA/w5EzIljjjrNpbQn8CzvxJci756AXO/Cq7A=="
spenderM.addToAdd.privateKey    = "8CvkFF5WZ7w5YDeoPfJ9BNPKEQUgqZGrHUSdboHaRyoi"
spenderM.addToAdd.fromAddress   = "1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX"
spenderM.addToAdd.toAddress     = "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
spenderM.addToAdd.amount        = 20000
spenderM.addToAdd.toAddresses   = ["1PiHKNK4NTxcuZEWqxKn9tF82kUoen2QTD","1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"]
spenderM.addToAdd.amounts       = [20000,10000]
spenderM.addToAdd.txHash1M      = "0100000001c971328f18336dbc6961c35378a9fa53561571357e8f8c1793fe2d4075f12af4010000008a47304402202fdf972a3481bd81442e6c212cbfd07cd8e1db440b5a4981b059f96e4c9342290220353447e526dc141308428b8affce3028cc21bded6d158b5b8471cde51ecf901c0141044ca8bee9fa5d4e372a00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cced88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87ffffffff02204e0000000000001976a914f9217131115f61d6835b97bf388089c9f999e33688ac10270000000000001976a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac00000000"
spenderM.addToAdd.txHash2M      = "0100000001c971328f18336dbc6961c35378a9fa53561571357e8f8c1793fe2d4075f12af4010000008b483045022100eb594841c5c78d9fc56543e33c4fabdb17117e0acb2de727bb8d24f01036de9f0220727009bee45330678dfc4bde9b04754012e932e5f8e0554b01b75b4bb74956150141044ca8bee9fa5d4e372a00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cced88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87ffffffff0210270000000000001976a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac204e0000000000001976a914f9217131115f61d6835b97bf388089c9f999e33688ac00000000"
spenderM.addToAdd.fee           = 10000
spenderM.addToAdd.note          = undefined
spenderM.addToAdd.txHash1       = "0100000001c971328f18336dbc6961c35378a9fa53561571357e8f8c1793fe2d4075f12af4010000008b483045022100c3ea4e526b5aa88a3f4122c093f27afc3b1a7f6a3d6938139668a1ed8d0a77c202207b3b53f96827938f22677a64068e50907a5662bc108d35e0180269872bf9c8be0141044ca8bee9fa5d4e372a00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cced88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87ffffffff02204e0000000000001976a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac10270000000000001976a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac00000000"
spenderM.addToAdd.txHash2       = "0100000001c971328f18336dbc6961c35378a9fa53561571357e8f8c1793fe2d4075f12af4010000008a473044022044e111fbce09ce4a4013a94be2136c8f7e2ca6439ea24e37fcda934f1d6fcc34022077670efeee20559a28500d7840df061e24b505f8a309a1eabe87edaad633c0cb0141044ca8bee9fa5d4e372a00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cced88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87ffffffff0210270000000000001976a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac204e0000000000001976a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac00000000"
spenderM.addToAdd.sweepHex      = "0100000002c971328f18336dbc6961c35378a9fa53561571357e8f8c1793fe2d4075f12af4010000008a47304402203cd3133b9ac7d8768e6cf2cc54d0328a4d6cfa0a3907a7f103c868bc40d945d402202f59a390e61582a3d9da403542573fb8d3b7072bd4c4475b14a98101cca7a2090141044ca8bee9fa5d4e372a00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cced88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87ffffffff6876d0264ed25aa69b30cda92020f7d7e78ae611be91368c843dfb27139fb45a000000008a473044022077e571a6781123e1791a29022438b12a6607db7c04ceaa47f7636c171c56313602203e69e7fd67c8a344325f8e2fe5d511ddd6978a9ada246234534f561b01a2e4bc0141044ca8bee9fa5d4e372a00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cced88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87ffffffff0160ea0000000000001976a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac00000000"
spenderM.addToAdd.toHdAccount   = [{ getReceiveAddress: () -> "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF" }]
spenderM.addToAdd.fromAddPKey   = Bitcoin.ECKey.fromWIF("5JdSM2jdvnZm8sLBz8Ac9Sfq1utDcxopzPhswf3c645s18AjX92")
spenderM.addToAdd.privKey       = "8CvkFF5WZ7w5YDeoPfJ9BNPKEQUgqZGrHUSdboHaRyoi"
################################################################################
spenderM.AccountToAdd = {}
spenderM.AccountToAdd.coins = 'unspent_outputs': [
  {
    'tx_hash': 'd93b4753e25b1669cb6522784af7ae391cb7181048e9330e09b62cd5374fe100'
    'tx_hash_big_endian': '00e14f37d52cb6090e33e9481018b71c39aef74a782265cb69165be253473bd9'
    'tx_index': 85757889
    'tx_output_n': 0
    'script': '76a914a93b2f63bb449b5c7c9bc05b37c541577266691b88ac'
    'xpub':
      'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
      'path': 'M/0/30'
    'value': 200000
    'value_hex': '030d40'
    'confirmations': 0
    'hash': '00e14f37d52cb6090e33e9481018b71c39aef74a782265cb69165be253473bd9'
    'index': 0
  }
]
spenderM.AccountToAdd.toAddress     = "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
spenderM.AccountToAdd.amount        = 10000
spenderM.AccountToAdd.fee           = 10000
spenderM.AccountToAdd.note          = undefined
spenderM.AccountToAdd.fromAccount   = 0
spenderM.AccountToAdd.txHash1       = "a75fb7ac06ea57291ba23dfdb0b1328d5ecd532df45075089ed82fa4bb6e4b71"
spenderM.AccountToAdd.txHash2       = "e636e504df7dd6100f20bf0bdaaf9bda4d2b9402d39d76ebbc283485d4d466ab"
spenderM.AccountToAdd.fromHdAccount = [
  {
    getReceiveAddress: () -> "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
    getChangeAddress: () -> "1PiHKNK4NTxcuZEWqxKn9tF82kUoen2QTD"
    containsAddressInCache: () -> false
    extendedPrivateKey: "xprv9zJ1cTHnqzgBP2boCwpP47LBzjGLKXkwYqXoYnV4yrBmstmw6SVtirpvm4GESg9YLn9R386qpmnsrcC5rvrpEJAXSrfqQR3qGtjGv5ddV9g"
  }
]
spenderM.AccountToAdd.fromHdAccountERROR = [
  {
    getReceiveAddress: () -> "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
    getChangeAddress: () -> "1PiHKNK4NTxcuZEWqxKn9tF82kUoen2QTD"
    containsAddressInCache: () -> true
    extendedPrivateKey: "xprv9zJ1cTHnqzgBP2boCwpP47LBzjGLKXkwYqXoYnV4yrBmstmw6SVtirpvm4GESg9YLn9R386qpmnsrcC5rvrpEJAXSrfqQR3qGtjGv5ddV9g"
  }
]
################################################################################
spenderM.toEmail = {}
spenderM.toEmail.key = Bitcoin.ECKey.fromWIF("KzX25APdEb9E1kAdLntYQnhPbrau7LMfKgYJJXvkczsUw6yffkwN")
spenderM.toEmail.toAddress = "1PqVQh5EM9hfgKFetFAMMyLdJiiKVbNSAr"
spenderM.toEmail.txID1 = "2d0262b2a63550b0ba1e3c9466ec9f18dd2d7aa261550ceab1fbc00117af07bf"
spenderM.toEmail.txID2 = "50b8f89a91c8a51a160939cf245493b7b8888c4fa41f08be66bfabf1ed91c902"
spenderM.toEmail.email = "fotli@pou.cat"
################################################################################
spenderM.toMobile = {}
spenderM.toMobile.keys = {}
spenderM.toMobile.keys.key = Bitcoin.ECKey.fromWIF("5JgQYR659mLDAZTtiaiBRhShTdXHskurB3Gqrmu1veTs2QfTYv3")
spenderM.toMobile.keys.miniKey = "SFug1uTW4HSQbg4LUWQciv"
spenderM.toMobile.toAddress = "1BsM7vuHAtWs1U47R4PfvrgcvS8qmXqVhY"
spenderM.toMobile.txID1 = "955f6d44ee6ead9a3b40de2166b06366607f973285c9fd003f3052176aeedbfe"
spenderM.toMobile.txID2 = "7e7a50da870fbf7e1e49b060a558d0495764411871c3c78d14d447fdba1ef88c"
spenderM.toMobile.phone = "+34630100200"
################################################################################
