/**
 * Migration Script: Add Image Hashes to Existing Artworks
 * 
 * This script will:
 * 1. Connect to MongoDB
 * 2. Find all artworks without imageHash
 * 3. Generate SHA-256 and perceptual hashes for their images
 * 4. Update the artwork documents
 * 5. Create necessary indexes
 * 
 * Run this once after deploying the duplicate detection feature:
 * node backend/migrations/addImageHashes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Artwork = require('../models/Artwork');
const fs = require('fs').promises;
const path = require('path');
const { generateSHA256Hash, generatePerceptualHash } = require('../utils/imageHash');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual';

async function migrateArtworks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    // Find artworks without imageHash
    const artworks = await Artwork.find({ imageHash: { $exists: false } });
    console.log(`Found ${artworks.length} artworks to process\n`);

    if (artworks.length === 0) {
      console.log('✅ All artworks already have hashes!');
      await mongoose.connection.close();
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < artworks.length; i++) {
      const artwork = artworks[i];
      console.log(`[${i + 1}/${artworks.length}] Processing: ${artwork.title}`);

      try {
        // Extract filename from image_url
        const url = new URL(artwork.image_url);
        const filename = path.basename(url.pathname);
        const filePath = path.join(__dirname, '../uploads', filename);

        // Check if file exists
        try {
          await fs.access(filePath);
        } catch (err) {
          console.log(`  ⚠️  File not found: ${filename}`);
          errors.push({ artwork: artwork.title, error: 'File not found' });
          errorCount++;
          continue;
        }

        // Read file and generate hashes
        const fileBuffer = await fs.readFile(filePath);
        const imageHash = generateSHA256Hash(fileBuffer);
        const perceptualHash = await generatePerceptualHash(fileBuffer);

        // Check for duplicate hash before updating
        const duplicate = await Artwork.findOne({ 
          imageHash, 
          _id: { $ne: artwork._id } 
        });

        if (duplicate) {
          console.log(`  ⚠️  Duplicate detected! Same as: ${duplicate.title}`);
          errors.push({ 
            artwork: artwork.title, 
            error: `Duplicate of ${duplicate.title}`,
            imageHash 
          });
          errorCount++;
          continue;
        }

        // Update artwork with hashes
        artwork.imageHash = imageHash;
        artwork.perceptualHash = perceptualHash;
        await artwork.save();

        console.log(`  ✅ Hash: ${imageHash.substring(0, 16)}...`);
        if (perceptualHash) {
          console.log(`  ✅ pHash: ${perceptualHash}`);
        }
        successCount++;

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors.push({ artwork: artwork.title, error: error.message });
        errorCount++;
      }

      console.log('');
    }

    // Create indexes
    console.log('\nCreating indexes...');
    try {
      await Artwork.collection.createIndex({ imageHash: 1 }, { unique: true });
      console.log('✅ Created unique index on imageHash');
      
      await Artwork.collection.createIndex({ perceptualHash: 1 });
      console.log('✅ Created index on perceptualHash');
      
      await Artwork.collection.createIndex({ artist_id: 1, created_at: -1 });
      console.log('✅ Created compound index on artist_id and created_at');
    } catch (indexError) {
      console.log('⚠️  Index creation warning:', indexError.message);
    }

    // Summary
    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Total artworks processed: ${artworks.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.artwork}: ${err.error}`);
      });
    }

    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run migration
migrateArtworks();
