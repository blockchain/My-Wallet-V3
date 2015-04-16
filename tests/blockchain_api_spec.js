var BlockchainAPI = require('../src/blockchain-api');

describe("BlockchainAPI", function() {
  beforeEach(function() {
    window.karma = true;
  });
  return describe("push_tx", function() {
    return it("should pass transaction hash to success callback", function() {
      var observer;
      spyOn($, "ajax").and.callFake(function(post) {
        return post.success(post.data.hash);
      });
      observer = {
        success: function(tx_hash) {},
        error: function() {}
      };
      spyOn(observer, "success");
      BlockchainAPI.push_tx({
        getId: function() {
          return "1234";
        },
        toHex: function() {
          return "";
        },
        toBuffer: function() {
          return new Buffer(0);
        }
      }, null, observer.success, observer.error);
      return expect(observer.success).toHaveBeenCalledWith("1234");
    });
  });
});
