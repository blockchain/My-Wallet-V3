var satoshi = 100000000; // One satoshi
var symbol_btc = {code: 'BTC', symbol: 'BTC', name: 'Bitcoin',  conversion: satoshi, symbolAppearsAfter: true, local: false}; // Default BTC Currency Symbol object
var symbol_local = {'conversion':0, 'symbol':'$', 'name':'U.S. dollar', 'symbolAppearsAfter':false, 'local':true, 'code':'USD'}; // Users local currency object
var symbol = symbol_btc; // Active currency object
var resource = 'Resources/';
var war_checksum;
var min = true; // whether to load minified scripts
var APP_VERSION = '3.0'; // Need some way to set this dynamically
var APP_NAME = 'javascript_web';
var IMPORTED_APP_NAME = 'external'; // Need some way to set this dynamically
var IMPORTED_APP_VERSION = '0';

module.exports = {
  APP_NAME: 'javascript_web',
  APP_VERSION: '3.0',
  getBTCSymbol: getBTCSymbol,
  getLocalSymbol: getLocalSymbol,
  satoshi: satoshi,
  setLocalSymbol: setLocalSymbol,
  setBTCSymbol: setBTCSymbol,
  playSound: playSound,
  sShift: sShift
};

function myprint (x) {console.log(x); }

function setLocalSymbol (new_symbol) {
  if (!new_symbol) {
    return;
  }

  if (symbol === symbol_local) {
    symbol_local = new_symbol;
    symbol = symbol_local;
  } else {
    symbol_local = new_symbol;
  }
}

function getLocalSymbol () {
  return symbol_local;
}

function setBTCSymbol (new_symbol) {
  if (!new_symbol) {
    return;
  }

  if (symbol === symbol_btc) {
    symbol_btc = new_symbol;
    symbol = symbol_btc;
  } else {
    symbol_btc = new_symbol;
  }
}

function getBTCSymbol () {
  return symbol_btc;
}
// used iOS
var _sounds = {};
function playSound (id) {
  try {
    if (!_sounds[id]) {
      _sounds[id] = new Audio('/' + resource + id + '.wav');
    }

    _sounds[id].play();
  } catch (e) { }
}

// Ignore Console
try {
  if (!window.console) {
    var names = ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml',
                 'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'];

    window.console = {};
    for (var i = 0; i < names.length; ++i) {
      window.console[names[i]] = function () {};
    }
  }
} catch (e) {
}
// The current 'shift' value - BTC = 1, mBTC = 3, uBTC = 6
function sShift (symbol) {
  return (satoshi / symbol.conversion).toString().length-1;
}
