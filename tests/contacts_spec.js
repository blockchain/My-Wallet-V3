const proxyquire = require('proxyquireify')(require);

const uuid = () => 'my-uuid';

let mockPayload = {};

let Metadata = {
  read (mdid) {
    return Promise.resolve('xpub');
  },
  fromMasterHDNode (n, masterhdnode) {
    return {
      create () {},
      fetch () {
        return Promise.resolve(mockPayload);
      },
      update () {
        return Promise.resolve(mockPayload);
      }
    };
  }
};

let SharedMetadata = {
  fromMasterHDNode (n, masterhdnode) {
    return {
      publishXPUB () { return }
    };
  }
};

const stubs = {
  'uuid': uuid,
  './metadata': Metadata,
  './sharedMetadata': SharedMetadata
};

const Contacts = proxyquire('../src/contacts', stubs);

describe('contact', () => {
  it('should contruct an object with new', () => {
    const cs = new Contacts('fakeMasterHDNode')
    expect(cs.list).toEqual({})
  });

});
