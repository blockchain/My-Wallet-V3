
proxyquire = require('proxyquireify')(require)
unspent = require('./data/unspent-outputs')

MyWallet =
  wallet:
    fee_per_kb: 10000
    isUpgradedToHD: true
    spendableActiveAddresses: [
      '16SPAGz8vLpP3jNTcP7T2io1YccMbjhkee',
      '1FBHaa3JNjTbhvzMBdv2ymaahmgSSJ4Mis'
    ]
    hdwallet:
      accounts: [
        {
          receiveAddress: '1CAAZHV1YJcWojefgTEJMG1TjqyEzDuvA6',
          extendedPublicKey: 'xpub6DX2ZjB6qgNH5GFusizVD2yHsm7T9vD6eQNHzth4Zy6MPQim96UPdHurhXDSaz8aUtPo3XktydjkMt1ZJCL9pjPm9YXJYW3K9cYDcJAuT2v'
        },
        {
          receiveAddress: '1K8ChnK2TCpADx6auTDjB613zrf4wBsawx',
          extendedPublicKey: 'xpub6DX2ZjB6qgNH8YVEAX4tKdTGrEyLF5h2FVarCmWvRUpVREYL6c93xvt7ZFGK9x6vNjwiRxAd1pEo2WU5YNKPhnAZ8sh4CUefbGQJ8aUJaEv'
        }
      ]

API =
  getUnspent: (addresses, conf) -> Promise.resolve(unspent)

Payment = proxyquire('../src/payment', {
  './wallet': MyWallet
  './api': API
})

describe 'Payment', ->
  payment = undefined
  hdwallet = MyWallet.wallet.hdwallet

  data =
    address: '16SPAGz8vLpP3jNTcP7T2io1YccMbjhkee'
    addresses: ['16SPAGz8vLpP3jNTcP7T2io1YccMbjhkee', '1FBHaa3JNjTbhvzMBdv2ymaahmgSSJ4Mis']

  beforeEach ->
    JasminePromiseMatchers.install()
    payment = new Payment()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe 'new', ->

    it 'should create a new payment', (done) ->
      spyOn(Payment, 'return').and.callThrough()
      payment = new Payment()
      expect(Payment.return).toHaveBeenCalled()
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({}), done)

    it 'should create a new payment with preset options', (done) ->
      payment = new Payment({ to: [data.address], feePerKb: 22000 })
      result = { to: [data.address], feePerKb: 22000 }
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining(result), done)

  describe 'to', ->

    it 'should set an address', (done) ->
      payment.to(data.address)
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ to: [data.address] }), done)

    it 'should set multiple addresses', (done) ->
      payment.to(data.addresses)
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ to: data.addresses }), done)

    it 'should set to an account index', (done) ->
      payment.to(1)
      receiveAddress = hdwallet.accounts[1].receiveAddress
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ to: [receiveAddress] }), done)

    it 'should not set to an invalid account index', (done) ->
      payment.to(-1)
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ to: null }), done)

  describe 'from', ->

    it 'should set to an address ', (done) ->
      payment.from(data.address)
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: [data.address] }), done)

    it 'should set multiple addresses', (done) ->
      payment.from(data.addresses)
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: data.addresses }), done)

    it 'should set an account index', (done) ->
      payment.from(0)
      xpub = hdwallet.accounts[0].extendedPublicKey
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: [xpub] }), done)

    it 'should all addresses if no argument is specified', (done) ->
      payment.from()
      legacyAddresses = MyWallet.wallet.spendableActiveAddresses
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ from: legacyAddresses }), done)

    it 'should set the correct sweep amount and sweep fee', (done) ->
      payment.from(data.address)
      result = { sweepAmount: 16260, sweepFee: 3740 }
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining(result), done)

  describe 'feePerKb', ->

    it 'should set to a positive value', (done) ->
      payment.feePerKb(22000)
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ feePerKb: 22000 }), done)

    it 'should not set to a negative value', (done) ->
      payment.feePerKb(-10000)
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining({ feePerKb: null }), done)

    it 'should use the feePerKb when setting sweep values', (done) ->
      payment.feePerKb(30000)
      payment.from(data.address)
      result = { sweepAmount: 8780, sweepFee: 11220 }
      expect(payment.payment).toBeResolvedWith(jasmine.objectContaining(result), done)
