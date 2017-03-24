let proxyquire = require('proxyquireify')(require);

describe('AddressHD', () => {
  let stubs = {};
  let AddressHD = proxyquire('../src/address-hd', stubs);

  let account = {
    constructor: {
      name: 'HDAccount'
    },
    receiveAddressAtIndex: (i) => 'receive_' + String(i)
  };
  let a;

  beforeEach(() => {
    spyOn(account, 'receiveAddressAtIndex').and.callThrough();
  });

  describe('class', () => {
    describe('new AddressHD()', () => {
      it('should transform an Object to AddressHD', () => {
        a = new AddressHD({label: 'Hello'}, account, 0);
        expect(a.constructor.name).toEqual('AddressHD');
      });

      it('should deserialize the label', () => {
        a = new AddressHD({label: 'Hello'}, account, 0);
        expect(a.label).toEqual('Hello');
      });

      it('for a null entry, should set label to null', () => {
        a = new AddressHD(null, account, 0);
        expect(a.label).toEqual(null);
      });
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      a = new AddressHD({label: 'Hello'}, account, 0);
    });

    describe('toJSON', () => {
      it('should store the label', () => {
        let json = JSON.stringify(a);
        expect(JSON.parse(json)).toEqual(
          jasmine.objectContaining({label: 'Hello'}
        ));
      });

      it('should store a null entry if label is null', () => {
        a = new AddressHD(null, account, 0);
        let json = JSON.stringify(a);
        expect(json).toEqual('null');
      });

      it('should not serialize non-expected fields', () => {
        a.rarefield = 'I am an intruder';
        let json = JSON.stringify(a, null, 2);
        let obj = JSON.parse(json);

        expect(obj.label).toBeDefined();
        expect(obj.rarefield).not.toBeDefined();
      });
    });

    describe('address', () => {
      it('should use account.receiveAddressAtIndex', () => {
        expect(a.address).toEqual('receive_0');
        expect(account.receiveAddressAtIndex).toHaveBeenCalled();
      });

      it('should be lazy', () => {
        expect(a.address).toEqual('receive_0');
        expect(a.address).toEqual('receive_0');
        expect(account.receiveAddressAtIndex.calls.count()).toEqual(1);
      });
    });

    describe('index', () => {
      it('should have a getter', () => {
        expect(a.index).toEqual(0);
      });

      it('should not have a setter', () => {
        expect(() => { a.index = 1; }).toThrow();
      });
    });

    describe('label', () => {
      it('should have a getter and setter', () => {
        a.label = 'World';
        expect(a.label).toEqual('World');
      });
    });

    describe('balance', () => {
      it('should have a getter and setter', () => {
        a.balance = 1000;
        expect(a.balance).toEqual(1000);
      });
    });

    describe('used', () => {
      it('should have a getter and setter', () => {
        a.used = true;
        expect(a.used).toEqual(true);
      });
    });
  });
});
