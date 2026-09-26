import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise = globalForMongo.mongoClientPromise;

function getClientPromise() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is not configured");

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
    if (process.env.NODE_ENV !== "production") globalForMongo.mongoClientPromise = clientPromise;
  }

  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB_NAME?.trim() || "reelscape");
}
