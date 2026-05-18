require('dotenv').config();
const mongoose = require('mongoose');

const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/visualart';
const atlasUri = process.env.MONGODB_URI;

async function migrate() {
  try {
    if (!atlasUri) {
      throw new Error('MONGODB_URI is required for Atlas migration');
    }

    console.log('Connecting to local MongoDB...');
    const localConn = mongoose.createConnection(localUri);
    await new Promise((resolve, reject) => {
      localConn.once('open', resolve);
      localConn.once('error', reject);
    });
    console.log('Connected to local MongoDB');

    console.log('Connecting to Atlas MongoDB...');
    const atlasConn = mongoose.createConnection(atlasUri);
    await new Promise((resolve, reject) => {
      atlasConn.once('open', resolve);
      atlasConn.once('error', reject);
    });
    console.log('Connected to Atlas MongoDB');

    console.log('Fetching collections from local database...');
    const collections = await localConn.db.listCollections().toArray();

    for (let coll of collections) {
      const collName = coll.name;
      console.log(`Migrating collection: ${collName}`);

      const docs = await localConn.db.collection(collName).find({}).toArray();
      if (docs.length > 0) {
        await atlasConn.db.collection(collName).insertMany(docs);
        console.log(`Migrated ${docs.length} documents to ${collName}`);
      } else {
        console.log(`No documents in ${collName}`);
      }
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
