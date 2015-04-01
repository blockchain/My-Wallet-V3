var satoshi = 100000000; //One satoshi
var symbol_btc = {code : "BTC", symbol : "BTC", name : "Bitcoin",  conversion : satoshi, symbolAppearsAfter : true, local : false}; //Default BTC Currency Symbol object
var symbol_local = {"conversion":0,"symbol":"$","name":"U.S. dollar","symbolAppearsAfter":false,"local":true,"code":"USD"}; //Users local currency object
var symbol = symbol_btc; //Active currency object
var resource = 'Resources/';
var war_checksum;
var min = true; //whether to load minified scripts
var APP_VERSION = '1.0'; //Need some way to set this dynamically
var APP_NAME = 'javascript_web';
var IMPORTED_APP_NAME = 'external'; //Need some way to set this dynamically
var IMPORTED_APP_VERSION = '0';

function setLocalSymbol(new_symbol) {
  if (!new_symbol) return;

  if (symbol === symbol_local) {
    symbol_local = new_symbol;
    symbol = symbol_local;
  } else {
    symbol_local = new_symbol;
  }
}

function setBTCSymbol(new_symbol) {
  if (!new_symbol) return;

  if (symbol === symbol_btc) {
    symbol_btc = new_symbol;
    symbol = symbol_btc;
  } else {
    symbol_btc = new_symbol;
  }
}

//Ignore Console
if (!window.console) {
  var names = ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml",
               "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];

  window.console = {};
  for (var i = 0; i < names.length; ++i) {
    window.console[names[i]] = function() {};
  }
}

var ws;
var reconnectInterval;
function webSocketConnect(success) {
  try {
    function reallyConnect() {
      try {
        var url = "wss://ws.blockchain.info/inv";

        console.log('Connect ' + url);

        ws = new WebSocket(url);

        if (!ws) {
          return;
        }

        if (success)
          success(ws);
      } catch (e) {
        console.log(e);
      }
    }

    //Updates time last block was received and check for websocket connectivity
    function reconnectTimer () {
      if (!ws || ws.readyState == WebSocket.CLOSED) {
        reallyConnect();
      }
    }

    if (window.WebSocket) {
      reallyConnect();

      if (!reconnectInterval)
        reconnectInterval = setInterval(reconnectTimer, 20000);
    }
  } catch (e) {
    console.log(e);
  }
}

function BlockFromJSON(json) {
  return {
    hash : json.hash,
    time : json.time,
    blockIndex : json.blockIndex,
    height : json.height,
    txIndex : json.txIndexes,
    totalBTCSent : json.totalBTCSent,
    foundBy : json.foundBy,
    size : json.size
  };
}

function TransactionFromJSON(json) {
  return {
    hash : json.hash,
    size : json.size,
    txIndex : json.tx_index,
    time : json.time,
    inputs : json.inputs,
    out : json.out,
    blockIndex : json.block_index,
    result : json.result,
    blockHeight : json.block_height,
    balance : json.balance,
    double_spend : json.double_spend,
    note : json.note,
    account_indexes : [], // should be filled later
    setConfirmations : function(n_confirmations) {
      this.confirmations = n_confirmations;
    }
  };
}

function formatSatoshi(value, shift, no_comma) {
  if (!value)
    return '0.00';

  var neg = '';
  if (value < 0) {
    value = -value;
    neg = '-';
  }

  if (!shift) shift = 0;

  value = ''+parseInt(value);

  //TODO Clean this up
  var integerPart = (value.length > (8-shift) ? value.substr(0, value.length-(8-shift)) : '0');

  if (!no_comma) integerPart = integerPart.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");

  var decimalPart = value.length > (8-shift) ? value.substr(value.length-(8-shift)) : value;

  if (decimalPart && decimalPart != 0) {
    while (decimalPart.length < (8-shift)) decimalPart = "0"+decimalPart;
    decimalPart = decimalPart.replace(/0*$/, '');
    while (decimalPart.length < 2) decimalPart += "0";

    return neg + integerPart+"."+decimalPart;
  }

  return neg + integerPart;
}

function convert(x, conversion) {
  return (x / conversion).toFixed(2).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
}

//Convenience format satoshi as BTC value string
function formatBTC(x) {
  return formatSymbol(x, symbol_btc);
}

//The current 'shift' value - BTC = 1, mBTC = 3, uBTC = 6
function sShift(symbol) {
  return (satoshi / symbol.conversion).toString().length-1;
}

function formatSymbol(x, symbol, html) {
  var str;

  if (symbol !== symbol_btc) {
    str = convert(x, symbol.conversion);
  } else {
    str = formatSatoshi(x, sShift(symbol));
  }

  if (html) str = str.replace(/([1-9]\d*\.\d{2}?)(.*)/, "$1<span style=\"font-size:85%;\">$2</span>");

  if (symbol.symbolAppearsAfter)
    str += ' ' +symbol.symbol;
  else
    str = symbol.symbol + ' ' + str;

  return str;
}

var _sounds = {};
function playSound(id) {
  try {
    if (!_sounds[id])
      _sounds[id] = new Audio('/'+resource+id+'.wav');

    _sounds[id].play();
  } catch (e) { }
};

var MyStore = new function() {
  this.put = function(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch(e) {
      console.log(e);
    }
  };

  this.get = function(key, callback) {
    try {
      var result = localStorage.getItem(key);
    } catch(e) {
      console.log(e);
    }
    if (callback)
      callback(result);
    else
      return result;
  };

  this.remove = function(key) {
    try {
      localStorage.removeItem(key);
    } catch(e) {
      console.log(e);
    }
  };

  this.clear = function() {
    try {
      localStorage.clear();
    } catch(e) {
      console.log(e);
    }
  };
};

var AJAXRETRYDEFAULT = 2;

function retryAjax(ajaxParams) {
  var errorCallback;
  ajaxParams.tryCount = ajaxParams.tryCount || 0;
  ajaxParams.retryLimit = ajaxParams.retryLimit || AJAXRETRYDEFAULT;
  ajaxParams.suppressErrors = true;

  if (ajaxParams.error) {
    errorCallback = ajaxParams.error;
    delete ajaxParams.error;
  } else {
    errorCallback = function () { };
  }

  ajaxParams.complete = function (jqXHR, textStatus) {
    if ($.inArray(textStatus, ['timeout', 'abort', 'error']) > -1) {
      this.tryCount++;
      if (this.tryCount <= this.retryLimit) {

        // fire error handling on the last try
        if (this.tryCount === this.retryLimit) {
          this.error = errorCallback;
          delete this.suppressErrors;
        }

        //try again
        $.ajax(this);
        return true;
      }
      return true;
    }
  };

  $.ajax(ajaxParams);
};
