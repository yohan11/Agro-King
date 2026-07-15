import db from './lib/db.js';

async function test() {
  const users = await db.getTable('users');
  const orders = await db.getTable('orders');

  console.log('--- Sample Users ---');
  console.log(users.slice(0, 3));
  
  console.log('\n--- Sample Orders ---');
  console.log(orders.slice(0, 3));

  console.log('\n--- Match Test ---');
  const enriched = orders.map(o => {
    const owner = users.find(u => (u._id && u._id.toString() === o.user_id?.toString()) || (u.id && u.id.toString() === o.user_id?.toString()));
    return {
      orderId: o._id,
      user_id: o.user_id,
      ownerFound: !!owner,
      ownerName: owner?.name || 'Unknown'
    }
  });
  console.log(enriched.slice(0, 3));
}
test();
