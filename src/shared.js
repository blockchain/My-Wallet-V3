/* eslint-disable camelcase */
var resource = 'Resources/';

module.exports = {
  APP_NAME: 'javascript_web',
  APP_VERSION: '3.0',
  playSound: playSound
};

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
/* eslint-enable camelcase */
