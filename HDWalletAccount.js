function HDWalletAccount(seed, network) {
  var assert = Bitcoin.assert;
  var Address = Bitcoin.Address;
  var HDNode = Bitcoin.HDNode;
  var Transaction = Bitcoin.Transaction;
  var Transaction = Bitcoin.Transaction;
  var networks = Bitcoin.networks;

  network = network || networks.bitcoin

  // Stored in a closure to make accidental serialization less likely
  var masterkey = null
  var me = this
  this.accountZero = null
  this.internalAccount = null
  this.externalAccount = null

  // Addresses
  this.addresses = []
  this.changeAddresses = []
  // Transaction output data
  this.outputs = {}

  // Make a new master key
  this.newMasterKey = function(seed) {
    seed = seed || crypto.randomBytes(32)
    masterkey = Bitcoin.HDNode.fromSeedBuffer(seed, network)

    // HD first-level child derivation method should be hardened
    // See https://bitcointalk.org/index.php?topic=405179.msg4415254#msg4415254
    this.accountZero = masterkey.deriveHardened(0)
    this.externalAccount = this.accountZero.derive(0)
    this.internalAccount = this.accountZero.derive(1)

    me.addresses = []
    me.changeAddresses = []

    me.outputs = {}
  }

  this.newMasterKey(seed)

  this.generateAddress = function() {
    var key = this.externalAccount.derive(this.addresses.length)
    this.addresses.push(key.getAddress().toString())
    return this.addresses[this.addresses.length - 1]
  }

  this.generateChangeAddress = function() {
    var key = this.internalAccount.derive(this.changeAddresses.length)
    this.changeAddresses.push(key.getAddress().toString())
    return this.changeAddresses[this.changeAddresses.length - 1]
  }

  this.getBalance = function() {
    return this.getUnspentOutputs().reduce(function(memo, output){
      return memo + output.value
    }, 0)
  }

  this.getUnspentOutputs = function() {
    var utxo = []

    for(var key in this.outputs){
      var output = this.outputs[key]
      if(!output.to) utxo.push(outputToUnspentOutput(output))
    }

    return utxo
  }

  this.setUnspentOutputs = function(utxo) {
    var outputs = {}

    utxo.forEach(function(uo){
      validateUnspentOutput(uo)
      var o = unspentOutputToOutput(uo)
      outputs[o.from] = o
    })

    this.outputs = outputs
  }

  function outputToUnspentOutput(output){
    var hashAndIndex = output.from.split(":")

    return {
      hash: hashAndIndex[0],
      outputIndex: parseInt(hashAndIndex[1]),
      address: output.address,
      value: output.value,
      pending: output.pending
    }
  }

  function unspentOutputToOutput(o) {
    var hash = o.hash
    var key = hash + ":" + o.outputIndex
    return {
      from: key,
      address: o.address,
      value: o.value,
      pending: o.pending
    }
  }

  function validateUnspentOutput(uo) {
    var missingField

    if (isNullOrUndefined(uo.hash)) {
      missingField = "hash"
    }

    var requiredKeys = ['outputIndex', 'address', 'value']
    requiredKeys.forEach(function (key) {
      if (isNullOrUndefined(uo[key])){
        missingField = key
      }
    })

    if (missingField) {
      var message = [
        'Invalid unspent output: key', missingField, 'is missing.',
        'A valid unspent output must contain'
      ]
      message.push(requiredKeys.join(', '))
      message.push("and hash")
      throw new Error(message.join(' '))
    }
  }

  function isNullOrUndefined(value) {
    return value == undefined
  }


}