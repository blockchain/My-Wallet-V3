// crypto_utils.js : Sjors Provoost <sjors@blockchain.com> 2014-11-26
// Based on Crypto-JS v2.0.0. These functions no longer exist in the latest version. 
// We should strive to get rid of this file.

if (typeof window == "undefined" || !window)
    var _window = {};
else
    var _window = window;

// Mix in the current time (w/milliseconds) into the pool
function rng_seed_time() {
    rng_seed_int(new Date().getTime());
}

// Pool size must be a multiple of 4 and greater than 32.
// An array of bytes the size of the pool will be passed to init()
var rng_psize = 256;

//---------------------------------------------------------------------------
//rng.js
//---------------------------------------------------------------------------

// Random number generator - requires a PRNG backend, e.g. prng4.js

// For best results, put code like
// <body onClick='rng_seed_time();' onKeyPress='rng_seed_time();'>
// in your main HTML document.

var rng_state;
var rng_pool;
var rng_pptr;

// Mix in a 32-bit integer into the pool
function rng_seed_int(x) {
    rng_pool[rng_pptr++] ^= x & 255;
    rng_pool[rng_pptr++] ^= (x >> 8) & 255;
    rng_pool[rng_pptr++] ^= (x >> 16) & 255;
    rng_pool[rng_pptr++] ^= (x >> 24) & 255;
    if(rng_pptr >= rng_psize) rng_pptr -= rng_psize;
}

// Mix in the current time (w/milliseconds) into the pool
function rng_seed_time() {
    rng_seed_int(new Date().getTime());
}

// Initialize the pool with junk if needed.
if(rng_pool == null) {
    rng_pool = new Array();
    rng_pptr = 0;
    var t;

    var crypto = _window.crypto || window.msCrypto;

    if(crypto && crypto.getRandomValues && typeof Int32Array != 'undefined') {

        console.log('Real Rand ');

        var word_array = new Int32Array(32);

        _window.crypto.getRandomValues(word_array);

        for(t = 0; t < word_array.length; ++t)
            rng_seed_int(word_array[t]);
    } else {
        while(rng_pptr < rng_psize) {  // extract some randomness from Math.random()
            t = Math.floor(65536 * Math.random());
            rng_pool[rng_pptr++] = t >>> 8;
            rng_pool[rng_pptr++] = t & 255;
        }
    }

    rng_pptr = 0;
    rng_seed_time();
//rng_seed_int(window.screenX);
//rng_seed_int(window.screenY);
}

function rng_get_byte() {
    if(rng_state == null) {
        rng_seed_time();
        rng_state = prng_newstate();
        rng_state.init(rng_pool);
        for(rng_pptr = 0; rng_pptr < rng_pool.length; ++rng_pptr)
            rng_pool[rng_pptr] = 0;
        rng_pptr = 0;
        //rng_pool = null;
    }
    // TODO: allow reseeding after first request
    return rng_state.next();
}

function rng_get_bytes(ba) {
    var i;
    for(i = 0; i < ba.length; ++i) ba[i] = rng_get_byte();
}

function SecureRandom() {}

SecureRandom.prototype.nextBytes = rng_get_bytes;