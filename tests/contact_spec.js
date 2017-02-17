let proxyquire = require('proxyquireify')(require);

fdescribe('contact', () => {

  let uuid = () => 'my-uuid'

  let Metadata = {
    read: (mdid) => {
      console.log('fake news!')
      return Promise.resolve({xpub: 'xpub'});
    }
  };

  // console.log(Metadata.read('hola'))

  let stubs = {
    'uuid': uuid,
    './metadata': Metadata
  };

  let Contact = proxyquire('../src/contact', stubs);
  it('should contruct an object with new', () => {
    const o = {
      id: 'id',
      mdid: 'mdid',
      name: 'name',
      xpub: 'xpub',
      trusted: 'trusted',
      invitationSent: 'invitationSent',
      invitationReceived: 'invitationReceived',
      facilitatedTxList: [{}]
    }
    const c = new Contact(o)
    expect(c.id).toEqual(o.id);
    expect(c.mdid).toEqual(o.mdid);
    expect(c.name).toEqual(o.name);
    expect(c.xpub).toEqual(o.xpub);
    expect(c.trusted).toEqual(o.trusted);
    expect(c.invitationSent).toEqual(o.invitationSent);
    expect(c.invitationReceived).toEqual(o.invitationReceived);
  });

  it('should contruct a contact with generated id', () => {
    const c = Contact.new({name: 'name'})
    expect(c.id).toEqual('my-uuid')
    expect(c.name).toEqual('name')
  });

  it('should fetch the xpub', (done) => {

    const c = Contact.new({name: 'name'})
    let match = jasmine.objectContaining({ xpub: 'xpub' });
    expect(c.fetchXPUB()).toBeResolvedWith(match, done);
  });

});
