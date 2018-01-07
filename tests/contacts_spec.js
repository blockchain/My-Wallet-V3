const R = require('ramda');
const proxyquire = require('proxyquireify')(require);

const uuid = () => 'my-uuid';

let mockPayload = {};

let RPRMessage = {
  id: 'da8730bd-19ec-4f6f-b115-343008913dd2',
  notified: false,
  payload: {
    id: '3c00935a-04bd-418e-94ba-2d87e98603cb',
    intended_amount: 1000
  },
  processed: false,
  recipient: '18gZzsF5T92rT7WpvdZDEdo6KEmE8vu5sJ',
  sender: '13XvRvToUZxfaTSydniv4roTh3jY5rMcWH',
  signature: 'H+BRYJzTDpTX+RqvFSw857CvsgpcchKQOXOvJG/tWJrzM6gUPIm9ulxpMoOF58wGP9ynpvTbx1LGHCmEVJMHeXQ=',
  type: 0
};

let PRMessage = {
  id: 'f863ac50-b5dc-49bc-9c75-d900dc229120',
  notified: false,
  payload: {
    address: '1PbNwFMdJm1tnvacAA3LQCiC2aojbzzThf',
    id: '3c00935a-04bd-418e-94ba-2d87e98603cb',
    intended_amount: 1000
  },
  processed: false,
  recipient: '13XvRvToUZxfaTSydniv4roTh3jY5rMcWH',
  sender: '18gZzsF5T92rT7WpvdZDEdo6KEmE8vu5sJ',
  signature: 'INOKgasWmu6H/92IXrC5JFxXOU7AQwDh7rbxqFRuAzcJXXzUTLoaujqUKlhMiNZVPPT49afBt8MhYVwzqk+mCkE=',
  type: 1
};

let PRRMessage = {
  id: 'e402dde8-3429-447f-9cb3-a20157930b3c',
  notified: false,
  payload: {
    address: '13ZZBJPxYTrSBxGT6hFZMBMm9VUmY1yzam',
    id: '79c1b029-cf84-474f-8e79-afadec42fc8e',
    tx_hash: 'tx-hash'
  },
  processed: false,
  recipient: '13XvRvToUZxfaTSydniv4roTh3jY5rMcWH',
  sender: '18gZzsF5T92rT7WpvdZDEdo6KEmE8vu5sJ',
  signature: 'IOXMhX3ErT74UcRvWcqq6PP+TCeJ+Ynb0THOUe/yGUP3cKBuxStR0z7AI0HFA5Gpa7dn8c0EWWZBOBO62+AYU3c=',
  type: 2
}

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
        return Promise.resolve({id: 'shared-link', mdid: 'invitator-mdid', contact: null});
      },
      processMessage (id) {
        return Promise.resolve(true);
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

  it('digestion of RPR', (done) => {
    spyOn(Contacts.prototype, 'save').and.callFake((something) => Promise.resolve({action: 'saved'}));
    const cs = new Contacts('fakeMasterHDNode');
    const contact = cs.new({name: 'Josep', mdid: '13XvRvToUZxfaTSydniv4roTh3jY5rMcWH'});
    const promise = cs.digestRPR(RPRMessage);
    promise.then(x => {
      const k = Object.keys(contact.facilitatedTxList)[0];
      const ftx = contact.facilitatedTxList[k];
      expect(ftx.state).toBe('waiting_address');
      expect(ftx.intended_amount).toBe(1000);
      expect(ftx.role).toBe('rpr_receiver');
      return x;
    });
    expect(promise).toBeResolved(done);
  });

  it('digestion of PR', (done) => {
    spyOn(Contacts.prototype, 'save').and.callFake((something) => Promise.resolve({action: 'saved'}));
    const cs = new Contacts('fakeMasterHDNode');
    const contact = cs.new({name: 'Enric', mdid: '18gZzsF5T92rT7WpvdZDEdo6KEmE8vu5sJ'});
    const promise = cs.digestPR(PRMessage);
    promise.then(x => {
      const k = Object.keys(contact.facilitatedTxList)[0];
      const ftx = contact.facilitatedTxList[k];
      expect(ftx.state).toBe('waiting_payment');
      expect(ftx.intended_amount).toBe(1000);
      expect(ftx.role).toBe('pr_receiver');
      expect(ftx.address).toBe('1PbNwFMdJm1tnvacAA3LQCiC2aojbzzThf');
      return x;
    });
    expect(promise).toBeResolved(done);
  });

  it('digestion of PRR', (done) => {
    spyOn(Contacts.prototype, 'save').and.callFake((something) => Promise.resolve({action: 'saved'}));
    const cs = new Contacts('fakeMasterHDNode');
    const contact = cs.new({name: 'you', mdid: '18gZzsF5T92rT7WpvdZDEdo6KEmE8vu5sJ'});
    const algo = contact.PR(15000, '79c1b029-cf84-474f-8e79-afadec42fc8e', 'pr_initiator', '13ZZBJPxYTrSBxGT6hFZMBMm9VUmY1yzam', 'my-note')

    const promise = cs.digestPRR(PRRMessage);
    promise.then(x => {
      const k = Object.keys(contact.facilitatedTxList)[0];
      const ftx = contact.facilitatedTxList[k];
      console.log(ftx)
      expect(ftx.state).toBe('payment_broadcasted');
      expect(ftx.intended_amount).toBe(15000);
      expect(ftx.role).toBe('pr_initiator');
      expect(ftx.note).toBe('my-note');
      expect(ftx.address).toBe('13ZZBJPxYTrSBxGT6hFZMBMm9VUmY1yzam');
      expect(ftx.tx_hash).toBe('tx-hash');
      return x;
    });
    expect(promise).toBeResolved(done);
  });
});
