let proxyquire = require('proxyquireify')(require);
let FacilitatedTx = proxyquire('../src/facilitatedTx', {});

describe('FacilitatedTx', () => {
  it('should contruct an object with new', () => {
    const o = {
      id: 'id',
      state: 'state',
      intended_amount: 'intended_amount',
      address: 'address',
      tx_hash: 'tx_hash',
      role: 'role',
      note: 'note',
      last_updated: 'last_updated'
    }
    const f = new FacilitatedTx(o)
    expect(f.id).toEqual(o.id);
    expect(f.state).toEqual(o.state);
    expect(f.intended_amount).toEqual(o.intended_amount);
    expect(f.address).toEqual(o.address);
    expect(f.tx_hash).toEqual(o.tx_hash);
    expect(f.role).toEqual(o.role);
    expect(f.note).toEqual(o.note);
    expect(f.last_updated).toEqual(o.last_updated);
  });

  it('should contruct an object with factory', () => {
    const o = {
      id: 'id',
      state: 'state',
      intended_amount: 'intended_amount',
      address: 'address',
      tx_hash: 'tx_hash',
      role: 'role',
      note: 'note',
      last_updated: 'last_updated'
    }
    const f = FacilitatedTx.factory(o)
    expect(f.id).toEqual(o.id);
    expect(f.state).toEqual(o.state);
    expect(f.intended_amount).toEqual(o.intended_amount);
    expect(f.address).toEqual(o.address);
    expect(f.tx_hash).toEqual(o.tx_hash);
    expect(f.role).toEqual(o.role);
    expect(f.note).toEqual(o.note);
    expect(f.last_updated).toEqual(o.last_updated);
  });

  it('should contruct a Request for a Payment Request', () => {
    const rpr = FacilitatedTx.RPR(1000, 'id', 'role', 'note')
    expect(rpr.id).toEqual('id');
    expect(rpr.state).toEqual(FacilitatedTx.WAITING_ADDRESS);
    expect(rpr.intended_amount).toEqual(1000);
    expect(rpr.address).toEqual(undefined);
    expect(rpr.tx_hash).toEqual(undefined);
    expect(rpr.role).toEqual('role');
    expect(rpr.note).toEqual('note');
  });

  it('should contruct a Payment Request', () => {
    const rpr = FacilitatedTx.PR(1000, 'id', 'role', 'address', 'note')
    expect(rpr.id).toEqual('id');
    expect(rpr.state).toEqual(FacilitatedTx.WAITING_PAYMENT);
    expect(rpr.intended_amount).toEqual(1000);
    expect(rpr.address).toEqual('address');
    expect(rpr.tx_hash).toEqual(undefined);
    expect(rpr.role).toEqual('role');
    expect(rpr.note).toEqual('note');
  });
});
