import { Redis } from 'ioredis';
import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const dbPath = path.resolve(process.cwd(), 'agroking_db.json');

const defaultData = {
  users: [
    {
      id: 1,
      role: 'Admin',
      username: 'admin',
      password: 'password123', // plain text for MVP
      name: 'AGRO KING Admin',
      phone: '000000000',
      location: 'HQ'
    },
    {
      id: 2,
      role: 'Farmer',
      username: 'paul',
      password: 'pass', // plain text for MVP
      name: 'Paul Éleveur',
      phone: '000000000',
      location: 'Village Agro'
    }
  ],
  orders: [],
  cycles: [],
  milieus: []
};

let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
}

class JsonDB {
  async read() {
    if (redisClient) {
      const data = await redisClient.get('agroking_data');
      if (data) {
        return JSON.parse(data);
      } else {
        await redisClient.set('agroking_data', JSON.stringify(defaultData));
        return defaultData;
      }
    }
    
    // Fallback to local file if no Redis
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return defaultData;
    }
  }

  async write(data) {
    if (redisClient) {
      await redisClient.set('agroking_data', JSON.stringify(data));
    } else {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    }
  }

  async getTable(tableName) {
    const data = await this.read();
    return data[tableName] || [];
  }

  async insert(tableName, item) {
    const data = await this.read();
    if (!data[tableName]) data[tableName] = [];
    
    // Auto-increment ID
    const maxId = data[tableName].reduce((max, i) => Math.max(max, i.id || 0), 0);
    const newItem = { id: maxId + 1, ...item };
    
    data[tableName].push(newItem);
    await this.write(data);
    return newItem;
  }
  
  async update(tableName, idValue, itemUpdate) {
    const data = await this.read();
    const index = data[tableName].findIndex(i => i.id === Number(idValue));
    if (index !== -1) {
      data[tableName][index] = { ...data[tableName][index], ...itemUpdate };
      await this.write(data);
      return data[tableName][index];
    }
    return null;
  }
}

const db = new JsonDB();
export default db;
