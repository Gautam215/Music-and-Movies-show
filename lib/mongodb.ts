import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise = globalForMongo.mongoClientPromise;

function getClientPromise() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is not configured");

  if (!clientPromise) {
    const promise = new MongoClient(uri).connect();
    // Self-heal: if this connection fails, do not keep the rejected
    // promise forever. Clear it so the next request tries again.
    promise.catch(() => {
      if (clientPromise === promise) clientPromise = undefined;
      if (globalForMongo.mongoClientPromise === promise)
        globalForMongo.mongoClientPromise = undefined;
    });
    clientPromise = promise;
    if (process.env.NODE_ENV !== "production")
      globalForMongo.mongoClientPromise = clientPromise;
  }

  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB_NAME?.trim() || "reelscape");
}
