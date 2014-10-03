/*
 * Crypto-JS v2.0.0
 * http://code.google.com/p/crypto-js/
 * Copyright (c) 2009, Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */

var base64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

if (typeof window == "undefined" || !window)
    var _window = {};
else
    var _window = window;

// Global Crypto object
var Crypto = _window.Crypto = {};

// Crypto utilities
var util = Crypto.util = {

	// Bit-wise rotate left
	rotl: function (n, b) {
		return (n << b) | (n >>> (32 - b));
	},

	// Bit-wise rotate right
	rotr: function (n, b) {
		return (n << (32 - b)) | (n >>> b);
	},

	// Swap big-endian to little-endian and vice versa
	endian: function (n) {

		// If number given, swap endian
		if (n.constructor == Number) {
			return util.rotl(n,  8) & 0x00FF00FF |
			       util.rotl(n, 24) & 0xFF00FF00;
		}

		// Else, assume array and swap all items
		for (var i = 0; i < n.length; i++)
			n[i] = util.endian(n[i]);
		return n;

	},

	// Generate an array of any length of random bytes
	randomBytes: function (n) {
		for (var bytes = []; n > 0; n--)
			bytes.push(Math.floor(Math.random() * 256));
		return bytes;
	},

	// Convert a byte array to big-endian 32-bit words
	bytesToWords: function (bytes) {
		for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
			words[b >>> 5] |= bytes[i] << (24 - b % 32);
		return words;
	},

	// Convert big-endian 32-bit words to a byte array
	wordsToBytes: function (words) {
		for (var bytes = [], b = 0; b < words.length * 32; b += 8)
			bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
		return bytes;
	},

	// Convert a byte array to a hex string
	bytesToHex: function (bytes) {
		for (var hex = [], i = 0; i < bytes.length; i++) {
			hex.push((bytes[i] >>> 4).toString(16));
			hex.push((bytes[i] & 0xF).toString(16));
		}
		return hex.join("");
	},

	// Convert a hex string to a byte array
	hexToBytes: function (hex) {
		for (var bytes = [], c = 0; c < hex.length; c += 2)
			bytes.push(parseInt(hex.substr(c, 2), 16));
		return bytes;
	},

	// Convert a byte array to a base-64 string
	bytesToBase64: function (bytes) {

		// Use browser-native function if it exists
		if (typeof btoa == "function") return btoa(Binary.bytesToString(bytes));

		for(var base64 = [], i = 0; i < bytes.length; i += 3) {
			var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
			for (var j = 0; j < 4; j++) {
				if (i * 8 + j * 6 <= bytes.length * 8)
					base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
				else base64.push("=");
			}
		}

		return base64.join("");

	},

	// Convert a base-64 string to a byte array
	base64ToBytes: function (base64) {

		// Use browser-native function if it exists
		if (typeof atob == "function") return Binary.stringToBytes(atob(base64));

		// Remove non-base-64 characters
		base64 = base64.replace(/[^A-Z0-9+\/]/ig, "");

		for (var bytes = [], i = 0, imod4 = 0; i < base64.length; imod4 = ++i % 4) {
			if (imod4 == 0) continue;
			bytes.push(((base64map.indexOf(base64.charAt(i - 1)) & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2)) |
			           (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
		}

		return bytes;

	}

};

// Crypto mode namespace
Crypto.mode = {};

// Crypto character encodings
var charenc = Crypto.charenc = {};

// UTF-8 encoding
var UTF8 = charenc.UTF8 = {

	// Convert a string to a byte array
	stringToBytes: function (str) {
		return Binary.stringToBytes(unescape(encodeURIComponent(str)));
	},

	// Convert a byte array to a string
	bytesToString: function (bytes) {
		return decodeURIComponent(escape(Binary.bytesToString(bytes)));
	}

};

// Binary encoding
var Binary = charenc.Binary = {

	// Convert a string to a byte array
	stringToBytes: function (str) {
		for (var bytes = [], i = 0; i < str.length; i++)
			bytes.push(str.charCodeAt(i));
		return bytes;
	},

	// Convert a byte array to a string
	bytesToString: function (bytes) {
		for (var str = [], i = 0; i < bytes.length; i++)
			str.push(String.fromCharCode(bytes[i]));
		return str.join("");
	}

};

/*
 * Crypto-JS v2.0.0
 * http://code.google.com/p/crypto-js/
 * Copyright (c) 2009, Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */

// Shortcuts
var C = Crypto,
    util = C.util,
    charenc = C.charenc,
    UTF8 = charenc.UTF8,
    Binary = charenc.Binary;

// Constants
var K = [ 0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
          0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
          0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
          0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
          0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
          0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
          0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
          0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
          0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
          0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
          0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
          0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
          0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
          0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
          0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
          0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2 ];

// Public API
var SHA256 = C.SHA256 = function (message, options) {
	var digestbytes = util.wordsToBytes(SHA256._sha256(message));
	return options && options.asBytes ? digestbytes :
	       options && options.asString ? Binary.bytesToString(digestbytes) :
	       util.bytesToHex(digestbytes);
};

// The core
SHA256._sha256 = function (message) {

	// Convert to byte array
	if (message.constructor == String) message = UTF8.stringToBytes(message);
	/* else, assume byte array already */

	var m = util.bytesToWords(message),
	    l = message.length * 8,
	    H = [ 0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
	          0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19 ],
	    w = [],
	    a, b, c, d, e, f, g, h, i, j,
	    t1, t2;

	// Padding
	m[l >> 5] |= 0x80 << (24 - l % 32);
	m[((l + 64 >> 9) << 4) + 15] = l;

	for (var i = 0; i < m.length; i += 16) {

		a = H[0];
		b = H[1];
		c = H[2];
		d = H[3];
		e = H[4];
		f = H[5];
		g = H[6];
		h = H[7];

		for (var j = 0; j < 64; j++) {

			if (j < 16) w[j] = m[j + i];
			else {

				var gamma0x = w[j - 15],
				    gamma1x = w[j - 2],
				    gamma0  = ((gamma0x << 25) | (gamma0x >>>  7)) ^
				              ((gamma0x << 14) | (gamma0x >>> 18)) ^
				               (gamma0x >>> 3),
				    gamma1  = ((gamma1x <<  15) | (gamma1x >>> 17)) ^
				              ((gamma1x <<  13) | (gamma1x >>> 19)) ^
				               (gamma1x >>> 10);

				w[j] = gamma0 + (w[j - 7] >>> 0) +
				       gamma1 + (w[j - 16] >>> 0);

			}

			var ch  = e & f ^ ~e & g,
			    maj = a & b ^ a & c ^ b & c,
			    sigma0 = ((a << 30) | (a >>>  2)) ^
			             ((a << 19) | (a >>> 13)) ^
			             ((a << 10) | (a >>> 22)),
			    sigma1 = ((e << 26) | (e >>>  6)) ^
			             ((e << 21) | (e >>> 11)) ^
			             ((e <<  7) | (e >>> 25));


			t1 = (h >>> 0) + sigma1 + ch + (K[j]) + (w[j] >>> 0);
			t2 = sigma0 + maj;

			h = g;
			g = f;
			f = e;
			e = d + t1;
			d = c;
			c = b;
			b = a;
			a = t1 + t2;

		}

		H[0] += a;
		H[1] += b;
		H[2] += c;
		H[3] += d;
		H[4] += e;
		H[5] += f;
		H[6] += g;
		H[7] += h;

	}

	return H;

};

// Package private blocksize
SHA256._blocksize = 16;

/*
 * Crypto-JS v2.5.4
 * http://code.google.com/p/crypto-js/
 * (c) 2009-2012 by Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */
(function(){

// Shortcuts
var C = Crypto,
    util = C.util,
    charenc = C.charenc,
    UTF8 = charenc.UTF8,
    Binary = charenc.Binary;

// Public API
var SHA1 = C.SHA1 = function (message, options) {
	var digestbytes = util.wordsToBytes(SHA1._sha1(message));
	return options && options.asBytes ? digestbytes :
	       options && options.asString ? Binary.bytesToString(digestbytes) :
	       util.bytesToHex(digestbytes);
};

// The core
SHA1._sha1 = function (message) {

	// Convert to byte array
	if (message.constructor == String) message = UTF8.stringToBytes(message);
	/* else, assume byte array already */

	var m  = util.bytesToWords(message),
	    l  = message.length * 8,
	    w  =  [],
	    H0 =  1732584193,
	    H1 = -271733879,
	    H2 = -1732584194,
	    H3 =  271733878,
	    H4 = -1009589776;

	// Padding
	m[l >> 5] |= 0x80 << (24 - l % 32);
	m[((l + 64 >>> 9) << 4) + 15] = l;

	for (var i = 0; i < m.length; i += 16) {

		var a = H0,
		    b = H1,
		    c = H2,
		    d = H3,
		    e = H4;

		for (var j = 0; j < 80; j++) {

			if (j < 16) w[j] = m[i + j];
			else {
				var n = w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16];
				w[j] = (n << 1) | (n >>> 31);
			}

			var t = ((H0 << 5) | (H0 >>> 27)) + H4 + (w[j] >>> 0) + (
			         j < 20 ? (H1 & H2 | ~H1 & H3) + 1518500249 :
			         j < 40 ? (H1 ^ H2 ^ H3) + 1859775393 :
			         j < 60 ? (H1 & H2 | H1 & H3 | H2 & H3) - 1894007588 :
			                  (H1 ^ H2 ^ H3) - 899497514);

			H4 =  H3;
			H3 =  H2;
			H2 = (H1 << 30) | (H1 >>> 2);
			H1 =  H0;
			H0 =  t;

		}

		H0 += a;
		H1 += b;
		H2 += c;
		H3 += d;
		H4 += e;

	}

	return [H0, H1, H2, H3, H4];

};

// Package private blocksize
SHA1._blocksize = 16;

SHA1._digestsize = 20;

})();
/*
 * Crypto-JS v2.0.0
 * http://code.google.com/p/crypto-js/
 * Copyright (c) 2009, Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 *
 * A JavaScript implementation of the RIPEMD-160 Algorithm
 * Version 2.2 Copyright Jeremy Lin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 * Also http://www.ocf.berkeley.edu/~jjlin/jsotp/
 * Ported to Crypto-JS by Stefan Thomas.
 */

	// Shortcuts
	var C = Crypto,
    util = C.util,
    charenc = C.charenc,
    UTF8 = charenc.UTF8,
    Binary = charenc.Binary;

	// Convert a byte array to little-endian 32-bit words
	util.bytesToLWords = function (bytes) {

		var output = Array(bytes.length >> 2);
		for (var i = 0; i < output.length; i++)
			output[i] = 0;
		for (var i = 0; i < bytes.length * 8; i += 8)
			output[i>>5] |= (bytes[i / 8] & 0xFF) << (i%32);
		return output;
	};

	// Convert little-endian 32-bit words to a byte array
	util.lWordsToBytes = function (words) {
		var output = [];
		for (var i = 0; i < words.length * 32; i += 8)
			output.push((words[i>>5] >>> (i % 32)) & 0xff);
		return output;
	};

	// Public API
	var RIPEMD160 = C.RIPEMD160 = function (message, options) {
		var digestbytes = util.lWordsToBytes(RIPEMD160._rmd160(message));
		return options && options.asBytes ? digestbytes :
			options && options.asString ? Binary.bytesToString(digestbytes) :
			util.bytesToHex(digestbytes);
	};

	// The core
	RIPEMD160._rmd160 = function (message)
	{
		// Convert to byte array
		if (message.constructor == String) message = UTF8.stringToBytes(message);

		var x = util.bytesToLWords(message),
		    len = message.length * 8;

		/* append padding */
		x[len >> 5] |= 0x80 << (len % 32);
		x[(((len + 64) >>> 9) << 4) + 14] = len;

		var h0 = 0x67452301;
		var h1 = 0xefcdab89;
		var h2 = 0x98badcfe;
		var h3 = 0x10325476;
		var h4 = 0xc3d2e1f0;

		for (var i = 0; i < x.length; i += 16) {
			var T;
			var A1 = h0, B1 = h1, C1 = h2, D1 = h3, E1 = h4;
			var A2 = h0, B2 = h1, C2 = h2, D2 = h3, E2 = h4;
			for (var j = 0; j <= 79; ++j) {
				T = safe_add(A1, rmd160_f(j, B1, C1, D1));
				T = safe_add(T, x[i + rmd160_r1[j]]);
				T = safe_add(T, rmd160_K1(j));
				T = safe_add(bit_rol(T, rmd160_s1[j]), E1);
				A1 = E1; E1 = D1; D1 = bit_rol(C1, 10); C1 = B1; B1 = T;
				T = safe_add(A2, rmd160_f(79-j, B2, C2, D2));
				T = safe_add(T, x[i + rmd160_r2[j]]);
				T = safe_add(T, rmd160_K2(j));
				T = safe_add(bit_rol(T, rmd160_s2[j]), E2);
				A2 = E2; E2 = D2; D2 = bit_rol(C2, 10); C2 = B2; B2 = T;
			}
			T = safe_add(h1, safe_add(C1, D2));
			h1 = safe_add(h2, safe_add(D1, E2));
			h2 = safe_add(h3, safe_add(E1, A2));
			h3 = safe_add(h4, safe_add(A1, B2));
			h4 = safe_add(h0, safe_add(B1, C2));
			h0 = T;
		}
		return [h0, h1, h2, h3, h4];
	}

	function rmd160_f(j, x, y, z)
	{
		return ( 0 <= j && j <= 15) ? (x ^ y ^ z) :
			(16 <= j && j <= 31) ? (x & y) | (~x & z) :
			(32 <= j && j <= 47) ? (x | ~y) ^ z :
			(48 <= j && j <= 63) ? (x & z) | (y & ~z) :
			(64 <= j && j <= 79) ? x ^ (y | ~z) :
			"rmd160_f: j out of range";
	}
	function rmd160_K1(j)
	{
		return ( 0 <= j && j <= 15) ? 0x00000000 :
			(16 <= j && j <= 31) ? 0x5a827999 :
			(32 <= j && j <= 47) ? 0x6ed9eba1 :
			(48 <= j && j <= 63) ? 0x8f1bbcdc :
			(64 <= j && j <= 79) ? 0xa953fd4e :
			"rmd160_K1: j out of range";
	}
	function rmd160_K2(j)
	{
		return ( 0 <= j && j <= 15) ? 0x50a28be6 :
			(16 <= j && j <= 31) ? 0x5c4dd124 :
			(32 <= j && j <= 47) ? 0x6d703ef3 :
			(48 <= j && j <= 63) ? 0x7a6d76e9 :
			(64 <= j && j <= 79) ? 0x00000000 :
			"rmd160_K2: j out of range";
	}
	var rmd160_r1 = [
		0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
		7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
		3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
		1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
		4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13
	];
	var rmd160_r2 = [
		5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
		6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
		15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
		8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
		12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11
	];
	var rmd160_s1 = [
		11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
		7,  6,  8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
		11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
		11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
		9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6
	];
	var rmd160_s2 = [
		8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
		9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
		9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
		15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
		8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11
	];

	/*
	 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	 * to work around bugs in some JS interpreters.
	 */
	function safe_add(x, y)
	{
		var lsw = (x & 0xFFFF) + (y & 0xFFFF);
		var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
		return (msw << 16) | (lsw & 0xFFFF);
	}

	/*
	 * Bitwise rotate a 32-bit number to the left.
	 */
	function bit_rol(num, cnt)
	{
		return (num << cnt) | (num >>> (32 - cnt));
	}
/*
 * Crypto-JS v2.5.4
 * http://code.google.com/p/crypto-js/
 * (c) 2009-2012 by Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */
/*!
 * Crypto-JS contribution from Simon Greatrix
 */

(function(C){

// Create pad namespace
var C_pad = C.pad = {};

// Calculate the number of padding bytes required.
function _requiredPadding(cipher, message) {
    var blockSizeInBytes = cipher._blocksize * 4;
    var reqd = blockSizeInBytes - message.length % blockSizeInBytes;
    return reqd;
}

// Remove padding when the final byte gives the number of padding bytes.
var _unpadLength = function(cipher, message, alg, padding) {
	var pad = message.pop();
	if (pad == 0) {
		throw new Error("Invalid zero-length padding specified for " + alg
				+ ". Wrong cipher specification or key used?");
	}
	var maxPad = cipher._blocksize * 4;
	if (pad > maxPad) {
		throw new Error("Invalid padding length of " + pad
				+ " specified for " + alg
				+ ". Wrong cipher specification or key used?");
	}
	for ( var i = 1; i < pad; i++) {
		var b = message.pop();
		if (padding != undefined && padding != b) {
			throw new Error("Invalid padding byte of 0x" + b.toString(16)
					+ " specified for " + alg
					+ ". Wrong cipher specification or key used?");
		}
	}
};

// No-operation padding, used for stream ciphers
C_pad.NoPadding = {
        pad : function (cipher,message) {},
        unpad : function (cipher,message) {}
    };

// Zero Padding.
//
// If the message is not an exact number of blocks, the final block is
// completed with 0x00 bytes. There is no unpadding.
C_pad.ZeroPadding = {
    pad : function (cipher, message) {
        var blockSizeInBytes = cipher._blocksize * 4;
        var reqd = message.length % blockSizeInBytes;
        if( reqd!=0 ) {
            for(reqd = blockSizeInBytes - reqd; reqd>0; reqd--) {
                message.push(0x00);
            }
        }
    },

    unpad : function (cipher, message) {
        while (message[message.length - 1] == 0) {
            message.pop();
        }
    }
};

// ISO/IEC 7816-4 padding.
//
// Pads the plain text with an 0x80 byte followed by as many 0x00
// bytes are required to complete the block.
C_pad.iso7816 = {
    pad : function (cipher, message) {
        var reqd = _requiredPadding(cipher, message);
        message.push(0x80);
        for (; reqd > 1; reqd--) {
            message.push(0x00);
        }
    },

    unpad : function (cipher, message) {
    	var padLength;
    	for(padLength = cipher._blocksize * 4; padLength>0; padLength--) {
    		var b = message.pop();
    		if( b==0x80 ) return;
    		if( b!=0x00 ) {
    			throw new Error("ISO-7816 padding byte must be 0, not 0x"+b.toString(16)+". Wrong cipher specification or key used?");
    		}
    	}
    	throw new Error("ISO-7816 padded beyond cipher block size. Wrong cipher specification or key used?");
    }
};

// ANSI X.923 padding
//
// The final block is padded with zeros except for the last byte of the
// last block which contains the number of padding bytes.
C_pad.ansix923 = {
    pad : function (cipher, message) {
        var reqd = _requiredPadding(cipher, message);
        for (var i = 1; i < reqd; i++) {
            message.push(0x00);
        }
        message.push(reqd);
    },

    unpad : function (cipher,message) {
    	_unpadLength(cipher,message,"ANSI X.923",0);
    }
};

// ISO 10126
//
// The final block is padded with random bytes except for the last
// byte of the last block which contains the number of padding bytes.
C_pad.iso10126 = {
    pad : function (cipher, message) {
        var reqd = _requiredPadding(cipher, message);
        for (var i = 1; i < reqd; i++) {
            message.push(Math.floor(Math.random() * 256));
        }
        message.push(reqd);
    },

    unpad : function (cipher,message) {
    	_unpadLength(cipher,message,"ISO 10126",undefined);
    }
};

// PKCS7 padding
//
// PKCS7 is described in RFC 5652. Padding is in whole bytes. The
// value of each added byte is the number of bytes that are added,
// i.e. N bytes, each of value N are added.
C_pad.pkcs7 = {
    pad : function (cipher, message) {
        var reqd = _requiredPadding(cipher, message);
        for (var i = 0; i < reqd; i++) {
            message.push(reqd);
        }
    },

    unpad : function (cipher,message) {
    	_unpadLength(cipher,message,"PKCS 7",message[message.length-1]);
    }
};

// Create mode namespace
var C_mode = C.mode = {};

/**
 * Mode base "class".
 */
var Mode = C_mode.Mode = function (padding) {
    if (padding) {
        this._padding = padding;
    }
};

Mode.prototype = {
    encrypt: function (cipher, m, iv) {
        this._padding.pad(cipher, m);
        this._doEncrypt(cipher, m, iv);
    },

    decrypt: function (cipher, m, iv) {
        this._doDecrypt(cipher, m, iv);
        this._padding.unpad(cipher, m);
    },

    // Default padding
    _padding: C_pad.iso7816
};


/**
 * Electronic Code Book mode.
 *
 * ECB applies the cipher directly against each block of the input.
 *
 * ECB does not require an initialization vector.
 */
var ECB = C_mode.ECB = function () {
    // Call parent constructor
    Mode.apply(this, arguments);
};

// Inherit from Mode
var ECB_prototype = ECB.prototype = new Mode;

// Concrete steps for Mode template
ECB_prototype._doEncrypt = function (cipher, m, iv) {
    var blockSizeInBytes = cipher._blocksize * 4;
    // Encrypt each block
    for (var offset = 0; offset < m.length; offset += blockSizeInBytes) {
        cipher._encryptblock(m, offset);
    }
};
ECB_prototype._doDecrypt = function (cipher, c, iv) {
    var blockSizeInBytes = cipher._blocksize * 4;
    // Decrypt each block
    for (var offset = 0; offset < c.length; offset += blockSizeInBytes) {
        cipher._decryptblock(c, offset);
    }
};

// ECB never uses an IV
ECB_prototype.fixOptions = function (options) {
    options.iv = [];
};


/**
 * Cipher block chaining
 *
 * The first block is XORed with the IV. Subsequent blocks are XOR with the
 * previous cipher output.
 */
var CBC = C_mode.CBC = function () {
    // Call parent constructor
    Mode.apply(this, arguments);
};

// Inherit from Mode
var CBC_prototype = CBC.prototype = new Mode;

// Concrete steps for Mode template
CBC_prototype._doEncrypt = function (cipher, m, iv) {
    var blockSizeInBytes = cipher._blocksize * 4;

    // Encrypt each block
    for (var offset = 0; offset < m.length; offset += blockSizeInBytes) {
        if (offset == 0) {
            // XOR first block using IV
            for (var i = 0; i < blockSizeInBytes; i++)
            m[i] ^= iv[i];
        } else {
            // XOR this block using previous crypted block
            for (var i = 0; i < blockSizeInBytes; i++)
            m[offset + i] ^= m[offset + i - blockSizeInBytes];
        }
        // Encrypt block
        cipher._encryptblock(m, offset);
    }
};
CBC_prototype._doDecrypt = function (cipher, c, iv) {
    var blockSizeInBytes = cipher._blocksize * 4;

    // At the start, the previously crypted block is the IV
    var prevCryptedBlock = iv;

    // Decrypt each block
    for (var offset = 0; offset < c.length; offset += blockSizeInBytes) {
        // Save this crypted block
        var thisCryptedBlock = c.slice(offset, offset + blockSizeInBytes);
        // Decrypt block
        cipher._decryptblock(c, offset);
        // XOR decrypted block using previous crypted block
        for (var i = 0; i < blockSizeInBytes; i++) {
            c[offset + i] ^= prevCryptedBlock[i];
        }
        prevCryptedBlock = thisCryptedBlock;
    }
};


/**
 * Cipher feed back
 *
 * The cipher output is XORed with the plain text to produce the cipher output,
 * which is then fed back into the cipher to produce a bit pattern to XOR the
 * next block with.
 *
 * This is a stream cipher mode and does not require padding.
 */
var CFB = C_mode.CFB = function () {
    // Call parent constructor
    Mode.apply(this, arguments);
};

// Inherit from Mode
var CFB_prototype = CFB.prototype = new Mode;

// Override padding
CFB_prototype._padding = C_pad.NoPadding;

// Concrete steps for Mode template
CFB_prototype._doEncrypt = function (cipher, m, iv) {
    var blockSizeInBytes = cipher._blocksize * 4,
        keystream = iv.slice(0);

    // Encrypt each byte
    for (var i = 0; i < m.length; i++) {

        var j = i % blockSizeInBytes;
        if (j == 0) cipher._encryptblock(keystream, 0);

        m[i] ^= keystream[j];
        keystream[j] = m[i];
    }
};
CFB_prototype._doDecrypt = function (cipher, c, iv) {
    var blockSizeInBytes = cipher._blocksize * 4,
        keystream = iv.slice(0);

    // Encrypt each byte
    for (var i = 0; i < c.length; i++) {

        var j = i % blockSizeInBytes;
        if (j == 0) cipher._encryptblock(keystream, 0);

        var b = c[i];
        c[i] ^= keystream[j];
        keystream[j] = b;
    }
};


/**
 * Output feed back
 *
 * The cipher repeatedly encrypts its own output. The output is XORed with the
 * plain text to produce the cipher text.
 *
 * This is a stream cipher mode and does not require padding.
 */
var OFB = C_mode.OFB = function () {
    // Call parent constructor
    Mode.apply(this, arguments);
};

// Inherit from Mode
var OFB_prototype = OFB.prototype = new Mode;

// Override padding
OFB_prototype._padding = C_pad.NoPadding;

// Concrete steps for Mode template
OFB_prototype._doEncrypt = function (cipher, m, iv) {

    var blockSizeInBytes = cipher._blocksize * 4,
        keystream = iv.slice(0);

    // Encrypt each byte
    for (var i = 0; i < m.length; i++) {

        // Generate keystream
        if (i % blockSizeInBytes == 0)
            cipher._encryptblock(keystream, 0);

        // Encrypt byte
        m[i] ^= keystream[i % blockSizeInBytes];

    }
};
OFB_prototype._doDecrypt = OFB_prototype._doEncrypt;

/**
 * Counter
 * @author Gergely Risko
 *
 * After every block the last 4 bytes of the IV is increased by one
 * with carry and that IV is used for the next block.
 *
 * This is a stream cipher mode and does not require padding.
 */
var CTR = C_mode.CTR = function () {
    // Call parent constructor
    Mode.apply(this, arguments);
};

// Inherit from Mode
var CTR_prototype = CTR.prototype = new Mode;

// Override padding
CTR_prototype._padding = C_pad.NoPadding;

CTR_prototype._doEncrypt = function (cipher, m, iv) {
    var blockSizeInBytes = cipher._blocksize * 4;
    var counter = iv.slice(0);

    for (var i = 0; i < m.length;) {
        // do not lose iv
        var keystream = counter.slice(0);

        // Generate keystream for next block
        cipher._encryptblock(keystream, 0);

        // XOR keystream with block
        for (var j = 0; i < m.length && j < blockSizeInBytes; j++, i++) {
            m[i] ^= keystream[j];
        }

        // Increase counter
        if(++(counter[blockSizeInBytes-1]) == 256) {
            counter[blockSizeInBytes-1] = 0;
            if(++(counter[blockSizeInBytes-2]) == 256) {
                counter[blockSizeInBytes-2] = 0;
                if(++(counter[blockSizeInBytes-3]) == 256) {
                    counter[blockSizeInBytes-3] = 0;
                    ++(counter[blockSizeInBytes-4]);
                }
            }
        }
    }
};
CTR_prototype._doDecrypt = CTR_prototype._doEncrypt;

})(Crypto);
/*
 * Crypto-JS v2.5.4
 * http://code.google.com/p/crypto-js/
 * (c) 2009-2012 by Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */
(function(){

// Shortcuts
var C = Crypto,
    util = C.util,
    charenc = C.charenc,
    UTF8 = charenc.UTF8,
    Binary = charenc.Binary;

C.HMAC = function (hasher, message, key, options) {

	// Convert to byte arrays
	if (message.constructor == String) message = UTF8.stringToBytes(message);
	if (key.constructor == String) key = UTF8.stringToBytes(key);
	/* else, assume byte arrays already */

	// Allow arbitrary length keys
	if (key.length > hasher._blocksize * 4)
		key = hasher(key, { asBytes: true });

	// XOR keys with pad constants
	var okey = key.slice(0),
	    ikey = key.slice(0);
	for (var i = 0; i < hasher._blocksize * 4; i++) {
		okey[i] ^= 0x5C;
		ikey[i] ^= 0x36;
	}

	var hmacbytes = hasher(okey.concat(hasher(ikey.concat(message), { asBytes: true })), { asBytes: true });

	return options && options.asBytes ? hmacbytes :
	       options && options.asString ? Binary.bytesToString(hmacbytes) :
	       util.bytesToHex(hmacbytes);

};

})();
/*
 * Crypto-JS v2.5.4
 * http://code.google.com/p/crypto-js/
 * (c) 2009-2012 by Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */
(function(){

// Shortcuts
var C = Crypto,
    util = C.util,
    charenc = C.charenc,
    UTF8 = charenc.UTF8,
    Binary = charenc.Binary;

C.PBKDF2 = function (password, salt, keylen, options) {

	// Convert to byte arrays
	if (password.constructor == String) password = UTF8.stringToBytes(password);
	if (salt.constructor == String) salt = UTF8.stringToBytes(salt);
	/* else, assume byte arrays already */

	// Defaults
	var hasher = options && options.hasher || C.SHA1,
	    iterations = options && options.iterations || 1;

	// Pseudo-random function
	function PRF(password, salt) {
		return C.HMAC(hasher, salt, password, { asBytes: true });
	}

	// Generate key
	var derivedKeyBytes = [],
	    blockindex = 1;
	while (derivedKeyBytes.length < keylen) {
		var block = PRF(password, salt.concat(util.wordsToBytes([blockindex])));
		for (var u = block, i = 1; i < iterations; i++) {
			u = PRF(password, u);
			for (var j = 0; j < block.length; j++) block[j] ^= u[j];
		}
		derivedKeyBytes = derivedKeyBytes.concat(block);
		blockindex++;
	}

	// Truncate excess bytes
	derivedKeyBytes.length = keylen;

	return options && options.asBytes ? derivedKeyBytes :
	       options && options.asString ? Binary.bytesToString(derivedKeyBytes) :
	       util.bytesToHex(derivedKeyBytes);

};

})();
/*
 * Crypto-JS v2.5.4
 * http://code.google.com/p/crypto-js/
 * (c) 2009-2012 by Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */
(function(){

// Shortcuts
var C = Crypto,
    util = C.util,
    charenc = C.charenc,
    UTF8 = charenc.UTF8;

// Precomputed SBOX
var SBOX = [ 0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5,
             0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
             0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0,
             0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
             0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc,
             0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
             0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a,
             0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
             0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0,
             0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
             0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b,
             0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
             0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
             0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
             0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5,
             0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
             0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17,
             0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
             0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88,
             0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
             0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c,
             0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
             0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9,
             0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
             0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6,
             0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
             0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e,
             0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
             0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94,
             0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
             0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68,
             0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16 ];

// Compute inverse SBOX lookup table
for (var INVSBOX = [], i = 0; i < 256; i++) INVSBOX[SBOX[i]] = i;

// Compute multiplication in GF(2^8) lookup tables
var MULT2 = [],
    MULT3 = [],
    MULT9 = [],
    MULTB = [],
    MULTD = [],
    MULTE = [];

function xtime(a, b) {
	for (var result = 0, i = 0; i < 8; i++) {
		if (b & 1) result ^= a;
		var hiBitSet = a & 0x80;
		a = (a << 1) & 0xFF;
		if (hiBitSet) a ^= 0x1b;
		b >>>= 1;
	}
	return result;
}

for (var i = 0; i < 256; i++) {
	MULT2[i] = xtime(i,2);
	MULT3[i] = xtime(i,3);
	MULT9[i] = xtime(i,9);
	MULTB[i] = xtime(i,0xB);
	MULTD[i] = xtime(i,0xD);
	MULTE[i] = xtime(i,0xE);
}

// Precomputed RCon lookup
var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

// Inner state
var state = [[], [], [], []],
    keylength,
    nrounds,
    keyschedule;

var AES = C.AES = {

	/**
	 * Public API
	 */

	encrypt: function (message, password, options) {

		options = options || {};

		// Determine mode
		var mode = options.mode || new C.mode.OFB;

		// Allow mode to override options
		if (mode.fixOptions) mode.fixOptions(options);

		var

			// Convert to bytes if message is a string
			m = (
				message.constructor == String ?
				UTF8.stringToBytes(message) :
				message
			),

			// Generate random IV
			iv = options.iv || util.randomBytes(AES._blocksize * 4),

			// Generate key
			k = (
				password.constructor == String ?
				// Derive key from pass-phrase
				C.PBKDF2(password, iv, 32, { asBytes: true, iterations: options.iterations }) :
				// else, assume byte array representing cryptographic key
				password
			);

		// Encrypt
		AES._init(k);
		mode.encrypt(AES, m, iv);

		// Return ciphertext
		m = options.iv ? m : iv.concat(m);
		return (options && options.asBytes) ? m : util.bytesToBase64(m);

	},

	decrypt: function (ciphertext, password, options) {

		options = options || {};

		// Determine mode
		var mode = options.mode || new C.mode.OFB;

		// Allow mode to override options
		if (mode.fixOptions) mode.fixOptions(options);

		var

			// Convert to bytes if ciphertext is a string
			c = (
				ciphertext.constructor == String ?
				util.base64ToBytes(ciphertext):
			    ciphertext
			),

			// Separate IV and message
			iv = options.iv || c.splice(0, AES._blocksize * 4),

			// Generate key
			k =  (
				password.constructor == String ?
				// Derive key from pass-phrase
				C.PBKDF2(password, iv, 32, { asBytes: true, iterations: options.iterations }) :
				// else, assume byte array representing cryptographic key
				password
			);

		// Decrypt
		AES._init(k);
		mode.decrypt(AES, c, iv);

		// Return plaintext
		return (options && options.asBytes) ? c : UTF8.bytesToString(c);

	},


	/**
	 * Package private methods and properties
	 */

	_blocksize: 4,

	_encryptblock: function (m, offset) {

		// Set input
		for (var row = 0; row < AES._blocksize; row++) {
			for (var col = 0; col < 4; col++)
				state[row][col] = m[offset + col * 4 + row];
		}

		// Add round key
		for (var row = 0; row < 4; row++) {
			for (var col = 0; col < 4; col++)
				state[row][col] ^= keyschedule[col][row];
		}

		for (var round = 1; round < nrounds; round++) {

			// Sub bytes
			for (var row = 0; row < 4; row++) {
				for (var col = 0; col < 4; col++)
					state[row][col] = SBOX[state[row][col]];
			}

			// Shift rows
			state[1].push(state[1].shift());
			state[2].push(state[2].shift());
			state[2].push(state[2].shift());
			state[3].unshift(state[3].pop());

			// Mix columns
			for (var col = 0; col < 4; col++) {

				var s0 = state[0][col],
				    s1 = state[1][col],
				    s2 = state[2][col],
				    s3 = state[3][col];

				state[0][col] = MULT2[s0] ^ MULT3[s1] ^ s2 ^ s3;
				state[1][col] = s0 ^ MULT2[s1] ^ MULT3[s2] ^ s3;
				state[2][col] = s0 ^ s1 ^ MULT2[s2] ^ MULT3[s3];
				state[3][col] = MULT3[s0] ^ s1 ^ s2 ^ MULT2[s3];

			}

			// Add round key
			for (var row = 0; row < 4; row++) {
				for (var col = 0; col < 4; col++)
					state[row][col] ^= keyschedule[round * 4 + col][row];
			}

		}

		// Sub bytes
		for (var row = 0; row < 4; row++) {
			for (var col = 0; col < 4; col++)
				state[row][col] = SBOX[state[row][col]];
		}

		// Shift rows
		state[1].push(state[1].shift());
		state[2].push(state[2].shift());
		state[2].push(state[2].shift());
		state[3].unshift(state[3].pop());

		// Add round key
		for (var row = 0; row < 4; row++) {
			for (var col = 0; col < 4; col++)
				state[row][col] ^= keyschedule[nrounds * 4 + col][row];
		}

		// Set output
		for (var row = 0; row < AES._blocksize; row++) {
			for (var col = 0; col < 4; col++)
				m[offset + col * 4 + row] = state[row][col];
		}

	},

	_decryptblock: function (c, offset) {

		// Set input
		for (var row = 0; row < AES._blocksize; row++) {
			for (var col = 0; col < 4; col++)
				state[row][col] = c[offset + col * 4 + row];
		}

		// Add round key
		for (var row = 0; row < 4; row++) {
			for (var col = 0; col < 4; col++)
				state[row][col] ^= keyschedule[nrounds * 4 + col][row];
		}

		for (var round = 1; round < nrounds; round++) {

			// Inv shift rows
			state[1].unshift(state[1].pop());
			state[2].push(state[2].shift());
			state[2].push(state[2].shift());
			state[3].push(state[3].shift());

			// Inv sub bytes
			for (var row = 0; row < 4; row++) {
				for (var col = 0; col < 4; col++)
					state[row][col] = INVSBOX[state[row][col]];
			}

			// Add round key
			for (var row = 0; row < 4; row++) {
				for (var col = 0; col < 4; col++)
					state[row][col] ^= keyschedule[(nrounds - round) * 4 + col][row];
			}

			// Inv mix columns
			for (var col = 0; col < 4; col++) {

				var s0 = state[0][col],
				    s1 = state[1][col],
				    s2 = state[2][col],
				    s3 = state[3][col];

				state[0][col] = MULTE[s0] ^ MULTB[s1] ^ MULTD[s2] ^ MULT9[s3];
				state[1][col] = MULT9[s0] ^ MULTE[s1] ^ MULTB[s2] ^ MULTD[s3];
				state[2][col] = MULTD[s0] ^ MULT9[s1] ^ MULTE[s2] ^ MULTB[s3];
				state[3][col] = MULTB[s0] ^ MULTD[s1] ^ MULT9[s2] ^ MULTE[s3];

			}

		}

		// Inv shift rows
		state[1].unshift(state[1].pop());
		state[2].push(state[2].shift());
		state[2].push(state[2].shift());
		state[3].push(state[3].shift());

		// Inv sub bytes
		for (var row = 0; row < 4; row++) {
			for (var col = 0; col < 4; col++)
				state[row][col] = INVSBOX[state[row][col]];
		}

		// Add round key
		for (var row = 0; row < 4; row++) {
			for (var col = 0; col < 4; col++)
				state[row][col] ^= keyschedule[col][row];
		}

		// Set output
		for (var row = 0; row < AES._blocksize; row++) {
			for (var col = 0; col < 4; col++)
				c[offset + col * 4 + row] = state[row][col];
		}

	},


	/**
	 * Private methods
	 */

	_init: function (k) {
		keylength = k.length / 4;
		nrounds = keylength + 6;
		AES._keyexpansion(k);
	},

	// Generate a key schedule
	_keyexpansion: function (k) {

		keyschedule = [];

		for (var row = 0; row < keylength; row++) {
			keyschedule[row] = [
				k[row * 4],
				k[row * 4 + 1],
				k[row * 4 + 2],
				k[row * 4 + 3]
			];
		}

		for (var row = keylength; row < AES._blocksize * (nrounds + 1); row++) {

			var temp = [
				keyschedule[row - 1][0],
				keyschedule[row - 1][1],
				keyschedule[row - 1][2],
				keyschedule[row - 1][3]
			];

			if (row % keylength == 0) {

				// Rot word
				temp.push(temp.shift());

				// Sub word
				temp[0] = SBOX[temp[0]];
				temp[1] = SBOX[temp[1]];
				temp[2] = SBOX[temp[2]];
				temp[3] = SBOX[temp[3]];

				temp[0] ^= RCON[row / keylength];

			} else if (keylength > 6 && row % keylength == 4) {

				// Sub word
				temp[0] = SBOX[temp[0]];
				temp[1] = SBOX[temp[1]];
				temp[2] = SBOX[temp[2]];
				temp[3] = SBOX[temp[3]];

			}

			keyschedule[row] = [
				keyschedule[row - keylength][0] ^ temp[0],
				keyschedule[row - keylength][1] ^ temp[1],
				keyschedule[row - keylength][2] ^ temp[2],
				keyschedule[row - keylength][3] ^ temp[3]
			];

		}

	}

};

})();

//---------------------------------------------------------------------------
//prng4.js
//---------------------------------------------------------------------------

// prng4.js - uses Arcfour as a PRNG

function Arcfour() {
  this.i = 0;
  this.j = 0;
  this.S = new Array();
}

// Initialize arcfour context from key, an array of ints, each from [0..255]
function ARC4init(key) {
  var i, j, t;
  for(i = 0; i < 256; ++i)
    this.S[i] = i;
  j = 0;
  for(i = 0; i < 256; ++i) {
    j = (j + this.S[i] + key[i % key.length]) & 255;
    t = this.S[i];
    this.S[i] = this.S[j];
    this.S[j] = t;
  }
  this.i = 0;
  this.j = 0;
}

function ARC4next() {
  var t;
  this.i = (this.i + 1) & 255;
  this.j = (this.j + this.S[this.i]) & 255;
  t = this.S[this.i];
  this.S[this.i] = this.S[this.j];
  this.S[this.j] = t;
  return this.S[(t + this.S[this.i]) & 255];
}

Arcfour.prototype.init = ARC4init;
Arcfour.prototype.next = ARC4next;

// Plug in your RNG constructor here
function prng_newstate() {
  return new Arcfour();
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



