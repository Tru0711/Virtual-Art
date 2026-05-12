const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const ArtistProfile = require('../models/ArtistProfile');
const Artwork = require('../models/Artwork');

const router = express.Router();

// GET /api/museum/data?artistId=...
// Returns artists list + artworks grouped by artist.
router.get('/data', async (req, res) => {
  try {
    const { artistId } = req.query;

    // Determine which artist(s)
    let artistUserIds = [];
    let artistProfileIds = [];

    if (artistId && mongoose.Types.ObjectId.isValid(artistId)) {
      artistUserIds = [mongoose.Types.ObjectId(artistId)];

      const profiles = await ArtistProfile.find({ user_id: artistUserIds[0] }).lean();
      artistProfileIds = profiles.map((p) => p._id);
    } else {
      // all artists
      const profiles = await ArtistProfile.find({}).lean();
      artistProfileIds = profiles.map((p) => p._id);
      const uids = [...new Set(profiles.map((p) => String(p.user_id)))].filter(Boolean);
      artistUserIds = uids.map((id) => mongoose.Types.ObjectId(id));
    }

    const profileById = new Map();
    const profiles = await ArtistProfile.find({ _id: { $in: artistProfileIds } }).lean();
    profiles.forEach((p) => profileById.set(String(p._id), p));

    const users = await User.find({ _id: { $in: artistUserIds } }).select('full_name profile_picture user_type email').lean();

    const artists = users.map((u) => {
      const profile = profiles.find((p) => String(p.user_id) === String(u._id)) || null;
      return {
        id: profile?._id || u._id,
        userId: u._id,
        full_name: u.full_name,
        artist_name: profile?.artist_name || u.full_name,
        profile_picture: u.profile_picture ? u.profile_picture : '',
        bio: profile?.bio || '',
      };
    });

    // Artworks: only published/sold
    const PUBLISHED_STATUSES = ['published', 'sold'];
    const artistIds = [...artistUserIds, ...artistProfileIds];

    const artworks = await Artwork.find({
      status: { $in: PUBLISHED_STATUSES },
      artist_id: { $in: artistIds },
    })
      .select('title category image_url watermarked_image_url artist_id frameStyle width height gallery_name gallery_slug gallery_id')
      .lean();

    const artworksByArtist = {};

    for (const art of artworks) {
      const rawArtistId = art.artist_id;
      const key = String(rawArtistId);

      if (!artworksByArtist[key]) artworksByArtist[key] = [];

      artworksByArtist[key].push({
        _id: art._id,
        artworkId: art._id,
        title: art.title,
        category: art.category,
        image_url: art.image_url,
        watermarked_image_url: art.watermarked_image_url,
        artist_id: rawArtistId,
        frameStyle: art.frameStyle || 'classic',
        width: art.width,
        height: art.height,
        gallery_name: art.gallery_name,
        gallery_slug: art.gallery_slug,
        gallery_id: art.gallery_id,
      });
    }

    res.json({ artists, artworksByArtist });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to load museum data' });
  }
});

module.exports = router;

