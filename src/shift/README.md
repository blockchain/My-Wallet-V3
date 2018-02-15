# ShapeShift

Blockchain wallet ShapeShift integration.

## Usage

ShapeShift is exposed as `MyWallet.wallet.shapeshift`

The user's Metadata HD node must be cached for ShapeShift to work.

## API

### [ShapeShift](./index.js)

#### `getRate(String: coinPair): Promise<MarketInfo>`

MarketInfo example:

```
{
  "pair": "btc_eth",
  "rate": 14.27292263,
  "minerFee": 0.005,
  "limit": 1.76000156,
  "minimum": 0.000699,
  "maxLimit": 1.76000156
}
```

#### `getQuote(String: coinPair, Number: amount): Promise<Quote>`

Where `amount` is an amount in Bitcoin or Ether.

#### `shift(Quote: quote, String?: secPass): Promise<Trade>`

Must be passed a second password if the wallet is double encrypted.

#### `watchTradeForCompletion(Trade: trade, { Number: pollTime }): Promise<Trade>`

Polls a pending trade until it's completed. Optional `pollTime` to change polling rate, defaults to `1000` (ms).

#### `updateTradeStatus(Trade: trade): Promise<Trade>`

Updates the status of a trade.

### [Quote](./quote.js)

Simple data object for quotes.

### [Trade](./trade.js)

Simple data object for trades.
