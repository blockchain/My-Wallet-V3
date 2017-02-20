const R = require('ramda');
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
      publishXPUB () { return; },
      readInvitation (i) {
        switch (i) {
          case 'link-received':
            return Promise.resolve({id: 'invitation-id', mdid: 'biel-mdid', contact: undefined});
          case 'link-sent':
            return Promise.resolve({id: 'invitation-id', mdid: 'myself-mdid', contact: 'joan-mdid'});
          default:
            return Promise.resolve({id: 'invitation-id', mdid: 'dude1', contact: 'dude2'});
        }
      },
      addTrusted (mdid) {
        return Promise.resolve(true);
      },
      deleteTrusted (mdid) {
        return Promise.resolve(true);
      },
      createInvitation () {
        return Promise.resolve({id: "shared-link", mdid: "invitator-mdid", contact: null});
      }
    };
  }
};

const stubs = {
  'uuid': uuid,
  './metadata': Metadata,
  './sharedMetadata': SharedMetadata
};

const Contacts = proxyquire('../src/contacts', stubs);

describe('contacts', () => {
  it('should contruct an object with an empty contact list', () => {
    const cs = new Contacts('fakeMasterHDNode');
    return expect(cs.list).toEqual({});
  });

  it('Contacts.new should add a new contact to the list', () => {
    const cs = new Contacts('fakeMasterHDNode');
    const nc = cs.new({name: 'mr moon'});
    const nameNewAdded = R.prop(nc.id, cs.list).name;
    return expect(nameNewAdded).toEqual('mr moon');
  });

  it('Contacts.delete should remove a contact from the list', () => {
    const cs = new Contacts('fakeMasterHDNode');
    const nc = cs.new({name: 'mr moon'});
    cs.delete(nc.id);
    const missing = R.prop(nc.id, cs.list);
    return expect(missing).toBe(undefined);
  });

  it('Contacts.search should filter the contacts list by text', () => {
    const cs = new Contacts('fakeMasterHDNode');
    const nc = cs.new({name: 'mr moon'});
    const result = cs.search(nc.name);
    const found = R.prop(nc.id, result);
    return expect(found.name).toBe('mr moon');
  });

  it('Contacts.get should get the contact by id', () => {
    const cs = new Contacts('fakeMasterHDNode');
    const nc = cs.new({name: 'mr moon'});
    const result = cs.get(nc.id);
    return expect(result.name).toBe('mr moon');
  });

  it('read Invitation received', (done) => {
    const cs = new Contacts('fakeMasterHDNode');
    const i = {name: 'Biel', invitationReceived: 'link-received'};
    const promise = cs.readInvitation(i)
      .then(c => {
        expect(c.mdid).toBe('biel-mdid');
        expect(c.name).toBe('Biel');
        expect(c.invitationReceived).toBe('link-received');
        return c;
      });
    return expect(promise).toBeResolved(done);
  });

  it('read invitation sent', (done) => {
    const cs = new Contacts('fakeMasterHDNode');
    const myContact = {name: 'Joan', invitationSent: 'link-sent'};
    cs.new(myContact);
    const promise = cs.readInvitationSent('my-uuid')
      .then(c => {
        expect(c.mdid).toBe('joan-mdid');
        return c;
      });
    return expect(promise).toBeResolved(done);
  });

  it('add trusted', (done) => {
    const cs = new Contacts('fakeMasterHDNode');
    const myContact = cs.new({name: 'Trusted Contact'});
    const promise = cs.addTrusted('my-uuid')
      .then(c => {
        expect(myContact.trusted).toBe(true);
        return c;
      });
    return expect(promise).toBeResolved(done);
  });

  it('delete trusted', (done) => {
    const cs = new Contacts('fakeMasterHDNode');
    const myContact = cs.new({name: 'UnTrusted Contact'});
    const promise = cs.deleteTrusted('my-uuid')
      .then(c => {
        expect(myContact.trusted).toBe(false);
        return c;
      });
    return expect(promise).toBeResolved(done);
  });

  it('create invitation', (done) => {
    const cs = new Contacts('fakeMasterHDNode');
    const promise = cs.createInvitation({name: 'me'}, {name: 'him'})
      .then(inv => {
        expect(inv.name).toBe('me');
        expect(inv.invitationReceived).toBe('shared-link');
        return inv;
      });
    return expect(promise).toBeResolved(done);
  });
});
