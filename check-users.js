const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Parse .env.local manually
const envPath = path.join(__dirname, '.env.local');
let uri = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('MONGODB_URI=')) {
      uri = trimmed.substring('MONGODB_URI='.length).replace(/(^"|"$|^'|'$)/g, '');
    }
  });
}

console.log('Connecting to URI:', uri ? uri.substring(0, 30) + '...' : 'UNDEFINED');

async function checkUsers() {
  if (!uri) {
    console.error('No MONGODB_URI found');
    return;
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('agroking');
    const users = await db.collection('users').find({}).toArray();
    console.log('Total users in DB:', users.length);
    users.forEach(u => {
      console.log({
        id: u._id,
        name: u.name,
        phone: u.phone,
        unique_id: u.unique_id,
        username: u.username,
        role: u.role,
        password: u.password
      });
    });
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.close();
  }
}

checkUsers();
