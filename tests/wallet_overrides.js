// MyWallet = {} // Mock the whole thing for the time being. Loading MyWallet causes a disconnect in Karma.

MyWallet.logout = function() {};

MyWallet.setPbkdf2Iterations = function() {};

MyWallet.setDoubleEncryption = function() {};

MyWallet.sendEvent = function() {};

var loadScript, playSound;

loadScript = function(src, success, error) {
  return success();
};

playSound = function(id) {};
