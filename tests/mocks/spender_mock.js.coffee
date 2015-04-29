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
spenderM.addToAdd.fee           = 10000
spenderM.addToAdd.note          = "This is an Address to Address mocked payment"
spenderM.addToAdd.txHash1       = "0100000001c971328f18336dbc6961c35378a9fa53561571357e8f8c1793fe2d4075f12af4010000008b483045022100c3ea4e526b5aa88a3f4122c093f27afc3b1a7f6a3d6938139668a1ed8d0a77c202207b3b53f96827938f22677a64068e50907a5662bc108d35e0180269872bf9c8be0141044ca8bee9fa5d4e372a00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cced88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87ffffffff02204e0000000000001976a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac10270000000000001976a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac00000000"
spenderM.addToAdd.txHash2       = "0100000001c971328f18336dbc6961c35378a9fa53561571357e8f8c1793fe2d4075f12af4010000008a473044022044e111fbce09ce4a4013a94be2136c8f7e2ca6439ea24e37fcda934f1d6fcc34022077670efeee20559a28500d7840df061e24b505f8a309a1eabe87edaad633c0cb0141044ca8bee9fa5d4e372a00e65116db5eeb8920bb796c12beaeb994e2026b411d3837494022cced88832dac7a494a47de55fc90dcd5e20bbc96f116c44773167a87ffffffff0210270000000000001976a9147acf6bb7b804392ed3f3537a4f999220cf1c4e8288ac204e0000000000001976a914fd342e1afdf81720024ec3bdeaeb6e2753973d0d88ac00000000"

################################################################################
# HD Account

spenderM.hdAccounts = [
    {
      extendedPublicKey:
        "xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp\
         9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ"
      extendedPrivateKey:
        "xprv9zJ1cTHnqzgBP2boCwpP47LBzjGLKXkwYqXoYnV4yrBmstmw6SVt\
         irpvm4GESg9YLn9R386qpmnsrcC5rvrpEJAXSrfqQR3qGtjGv5ddV9g"
      archived: false
      getReceivingAddress: () -> "1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX"
      getAccountExtendedKey : (p) -> if p then this.extendedPrivateKey else this.extendedPublicKey
      setUnspentOutputs: (utxo) -> return
    }
  ]
