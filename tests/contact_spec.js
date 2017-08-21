const proxyquire = require('proxyquireify')(require);

const uuid = () => 'my-uuid';
const Metadata = {
  read: (mdid) => {
    return Promise.resolve('xpub');
  }
};

const stubs = {
  'uuid': uuid,
  './metadata': Metadata
};

const Contact = proxyquire('../src/contact', stubs);

describe('contact', () => {
  it('should contruct an object with new', () => {
    const o = {
      id: 'id',
      mdid: 'mdid',
      name: 'name',
      xpub: 'xpub',
      trusted: 'trusted',
      invitationSent: 'invitationSent',
      invitationReceived: 'invitationReceived',
      facilitatedTxList: {}
    };
    const c = new Contact(o);
    expect(c.id).toEqual(o.id);
    expect(c.mdid).toEqual(o.mdid);
    expect(c.name).toEqual(o.name);
    expect(c.xpub).toEqual(o.xpub);
    expect(c.trusted).toEqual(o.trusted);
    expect(c.invitationSent).toEqual(o.invitationSent);
    expect(c.invitationReceived).toEqual(o.invitationReceived);
  });

  it('should contruct a contact with generated id', () => {
    const c = Contact.new({name: 'name'});
    expect(c.id).toEqual('my-uuid');
    expect(c.name).toEqual('name');
  });

  it('fetchXpub should fetch the xpub', (done) => {
    const c = Contact.new({name: 'name', mdid: 'mdid'});
    const promise = c.fetchXPUB();
    expect(promise).toBeResolved(done);
  });

  it('RPR should add an RPR to the list', () => {
    const c = Contact.new({name: 'name', mdid: 'mdid', facilitatedTxList: {}});
    c.RPR(1000, 'my-id', 'role', 'note', 0);
    const addedTx = c.facilitatedTxList['my-id'];
    expect(addedTx.id).toEqual('my-id');
  });

  it('PR should add a new PR to the list', () => {
    const c = Contact.new({name: 'name', mdid: 'mdid', facilitatedTxList: {}});
    c.PR(1000, 'my-id', 'role', 'address', 'note', 0);
    const addedTx = c.facilitatedTxList['my-id'];
    expect(addedTx.id).toEqual('my-id');
  });

  it('PR should add address to an exiting RPR and change the state to waiting payment', () => {
    const c = Contact.new({name: 'name', mdid: 'mdid', facilitatedTxList: {}});
    c.RPR(1000, 'my-id', 'role', 'note', 0);
    c.PR(undefined, 'my-id', undefined, 'address', undefined, 0);
    const addedTx = c.facilitatedTxList['my-id'];
    expect(addedTx.id).toEqual('my-id');
    expect(addedTx.state).toEqual('waiting_payment');
  });

  it('PRR should add the txhash and update state', () => {
    const c = Contact.new({name: 'name', mdid: 'mdid', facilitatedTxList: {}});
    c.RPR(1000, 'my-id', 'role', 'note', 0);
    c.PR(undefined, 'my-id', undefined, 'address', undefined, 0);
    c.PRR('txhash', 'my-id');
    const addedTx = c.facilitatedTxList['my-id'];
    expect(addedTx.id).toEqual('my-id');
    expect(addedTx.state).toEqual('payment_broadcasted');
  });
});
