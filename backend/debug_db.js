require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual';

mongoose.connect(uri)
  .then(async () => {
    const Artwork = require('./models/Artwork');
    const User = require('./models/User');
    const ArtistProfile = require('./models/ArtistProfile');
    
    // Get all artworks
    const artworks = await Artwork.find({}).select('artist_id title status').limit(10);
    console.log('Total artworks in DB:', artworks.length);
    console.log('Sample artworks:', JSON.stringify(artworks, null, 2));
    
    // Get all users with user_type=artist
    const artists = await User.find({user_type: 'artist'}).select('_id email full_name');
    console.log('\nArtists in DB:', JSON.stringify(artists, null, 2));
    
    // Get all artist profiles
    const profiles = await ArtistProfile.find({}).select('_id user_id artist_name');
    console.log('\nArtistProfiles in DB:', JSON.stringify(profiles, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
