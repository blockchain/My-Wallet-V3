describe "checkForRecentlyRedeemed", ->
  paidTo = 
    "d14659f29c8d7380cc9998e1d696494e1a1cd27e030b1824499b5ce3afec5ca": 
      address: "1K9H68VuHYgzEW13srbBRHQiZ48qsCZiz2"
      email: "info@blockchain.com"
      mobile: null
      redeemedAt: null
          
  beforeEach ->
    spyOn(MyWallet, "getPaidToDictionary").and.returnValue(paidTo)
    spyOn(MyWallet, "markPaidToEntryRedeemed")
    spyOn(MyWallet, "backupWalletDelayed").and.callFake () -> 
    
  it "should fetch related transactions", ->
    spyOn(MyWallet, "fetchRawTransactionsAndBalanceForAddresses")
    
    MyWallet.checkForRecentlyRedeemed()
    
    expect(MyWallet.fetchRawTransactionsAndBalanceForAddresses).toHaveBeenCalled()
    expect(MyWallet.fetchRawTransactionsAndBalanceForAddresses.calls.argsFor(0)[0]).toEqual ["1K9H68VuHYgzEW13srbBRHQiZ48qsCZiz2"]
  
    
  describe "while funds are in temp address", ->
    beforeEach ->
      spyOn(MyWallet, "fetchRawTransactionsAndBalanceForAddresses").and.returnValue {
        addresses:
          address: "1L3cXDDPCZ5pwEi7DpDVENX6bXhDGnZ4hC"
          final_balance: 21000
          n_tx: 1
          total_received: 21000
          total_sent: 0
        txs: [ # In reality it would contain the transaction depositing the funds in the temp address.
        ]
      }    

    it "should find nothing by default", ->
      MyWallet.checkForRecentlyRedeemed()
      expect(MyWallet.getPaidToDictionary).toHaveBeenCalled()
      expect(MyWallet.markPaidToEntryRedeemed).not.toHaveBeenCalled()
    
  describe "when tx moves funds out of temp address", ->
    beforeEach ->
      spyOn(MyWallet, "fetchRawTransactionsAndBalanceForAddresses").and.callFake (addresses, success, error) -> 
        success(
          [
            {
              "ver": 1,
              "inputs": [
                  {
                      "sequence": 4294967295,
                      "prev_out": {
                          "spent": true,
                          "tx_index": 81010549,
                          "type": 0,
                          "addr": "1K9H68VuHYgzEW13srbBRHQiZ48qsCZiz2",
                          "value": 21000,
                          "n": 0,
                          "script": "76a914d0e8df86808d97edd6352eefb99247b3f48bb36088ac"
                      },
                      "script": "483045022100e362e89038cd830153b572174b57cd052db2a50533639b287519840375b34f9102200891a6d36edfd068993ca953dfafc392b08036fdc8a2c209397702bf9e38b7490121038581d31eaa601472da2e6123364b4120a2106e8e8a1e04c61a181dbb7cbeae1a"
                  }
              ],
              "block_height": 348281,
              "relayed_by": "127.0.0.1",
              "out": [
                  {
                      "spent": false,
                      "tx_index": 81012083,
                      "type": 0,
                      "addr": "18xHu1tWtx3QPyKRrdVEiWgbKvYAxmiDdW",
                      "value": 11000,
                      "n": 0,
                      "script": "76a914573ddcf680b89ceb1cfcdcf647364ded1343fae788ac"
                  }
              ],
              "lock_time": 0,
              "result": -21000,
              "size": 192,
              "balance": 42000,
              "time": 1426770957,
              "tx_index": 81012083,
              "vin_sz": 1,
              "hash": "a289c418bbf0e81faf3a86834bd4373662c10c8406fc8011c83719c36374d826",
              "vout_sz": 1
            }
          ],
          [
            address: "1K9H68VuHYgzEW13srbBRHQiZ48qsCZiz2"
            final_balance: 0
            n_tx: 1
            total_received: 21000
            total_sent: 0
          ]
        )
      
    it "should mark as redeemed if tx moves funds out of temp address", ->
      MyWallet.checkForRecentlyRedeemed()
      expect(MyWallet.markPaidToEntryRedeemed).toHaveBeenCalledWith("d14659f29c8d7380cc9998e1d696494e1a1cd27e030b1824499b5ce3afec5ca", 1426770957)