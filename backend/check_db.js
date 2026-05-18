require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual';

mongoose.connect(uri)
  .then(async () => {
    const Artwork = require('./models/Artwork');
    
    // Get ALL artworks without any filter
    const allArtworks = await Artwork.find({});
    console.log('Total artworks in DB (no filter):', allArtworks.length);
    
    if (allArtworks.length > 0) {
      console.log('All artworks:', JSON.stringify(allArtworks.map(a => ({
        _id: a._id,
        title: a.title,
        artist_id: a.artist_id,
        status: a.status
      })), null, 2));
    }
    
    // Also check with different query
    const anyStatusArtworks = await Artwork.find({}).limit(20);
    console.log('\nAll artworks (raw):', anyStatusArtworks.length);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
