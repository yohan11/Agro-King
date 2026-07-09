import clientPromise from "@/lib/mongodb";

class MongoDB {
  async getTable(tableName) {
    const client = await clientPromise;
    const db = client.db("agroking"); // nom de ta base
    return db.collection(tableName).find().toArray();
  }

  async insert(tableName, item) {
    const client = await clientPromise;
    const db = client.db("agroking");
    const result = await db.collection(tableName).insertOne(item);
    return { id: result.insertedId, ...item };
  }

  async update(tableName, idValue, itemUpdate) {
    const client = await clientPromise;
    const db = client.db("agroking");
    const result = await db.collection(tableName).findOneAndUpdate(
      { _id: idValue },
      { $set: itemUpdate },
      { returnDocument: "after" }
    );
    return result.value;
  }
}

const db = new MongoDB();
export default db;
