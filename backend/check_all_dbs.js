require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual';

async function checkDatabases() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    
    // List all databases
    const adminDb = client.db().admin();
    const listDatabases = await adminDb.listDatabases();
    
    console.log('=== Databases in Cluster ===');
    for (const db of listDatabases.databases) {
      console.log(`- ${db.name} (size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    // Check the virtual database for collections
    console.log('\n=== Collections in "virtual" database ===');
    const virtualDb = client.db('virtual');
    const collections = await virtualDb.listCollections().toArray();
    for (const col of collections) {
      const count = await virtualDb.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }
    
    // Also check artworks directly
    const artworks = await virtualDb.collection('artworks').find({}).limit(10).toArray();
    console.log('\n=== Artworks in virtual database ===');
    console.log('Count:', artworks.length);
    if (artworks.length > 0) {
      console.log(JSON.stringify(artworks.map(a => ({ _id: a._id, title: a.title, artist_id: a.artist_id })), null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkDatabases();
