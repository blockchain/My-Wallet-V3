/* eslint-disable semi */
module.exports = (type) => {
  let o = {
    success: {
      'status': 'complete',
      'address': '0x2e67843ab8895e29b6bed8c57e0b3cbcede7d0db',
      'withdraw': '1qpg36s52kfwcqR7TJ85J1cwJtvKvNfsp',
      'incomingCoin': 0.05,
      'incomingType': 'ETH',
      'outgoingCoin': '0.00203185',
      'outgoingType': 'BTC',
      'transaction': '11048fec21ea10748800ada987e22bcdba18a4899df22e9b7ad5351c5458b3fb'
    }
  }
  return o[type]
}
