import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Save, X, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { getImageUrl } from '../../lib/imageUtils';
import { toastSuccess, toastError } from '../../lib/toast';
import ConfirmModal from '../auth/ConfirmModal';

const ArtistArtworksTab = ({
  artworks,
  profile,
  artistProfile,
  onArtworkDeleted,
  onArtworkUploaded,
}) => {
  const navigate = useNavigate();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, artworkId: null, artworkTitle: '' });
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    width: '',
    height: '',
    dimension_unit: 'cm',
  });
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: '',
    medium: '',
    price: '',
    width: '',
    height: '',
    dimension_unit: 'cm',
    image_file: null,
    image_url: '',
    signatureText: '',
    tags: '',
    size: 'medium',
  });

  const handleUploadArtwork = async (e) => {
    e.preventDefault();

    if (!profile || profile.user_type !== 'artist') {
      toastError('Please log in as an artist to upload artworks.');
      return;
    }

    if (!uploadForm.title || !uploadForm.category || !uploadForm.price) {
      toastError('Please fill in all required fields (Title, Category, Price)');
      return;
    }

    if (!uploadForm.image_file && !uploadForm.image_url) {
      toastError('Please provide either an image file or image URL');
      return;
    }

    setUploading(true);

    try {
      const artistId = artistProfile ? artistProfile.id : profile?.id;

      if (uploadForm.image_file) {
        const formData = new FormData();
        formData.append('title', uploadForm.title);
        formData.append('description', uploadForm.description || '');
        formData.append('category', uploadForm.category);
        formData.append('price', uploadForm.price);
        formData.append('width', uploadForm.width || '');
        formData.append('height', uploadForm.height || '');
        formData.append('dimension_unit', uploadForm.dimension_unit || 'cm');
        formData.append('image', uploadForm.image_file);
        formData.append('artist_id', artistId);
        if (uploadForm.signatureText) {
          formData.append('signatureText', uploadForm.signatureText);
        }

        await api.uploadArtwork(formData);
        toastSuccess('Artwork uploaded successfully! 🎨');
      } else {
        await api.createArtwork({
          artist_id: artistId,
          title: uploadForm.title,
          description: uploadForm.description || '',
          category: uploadForm.category,
          price: parseFloat(uploadForm.price),
          width: uploadForm.width ? parseFloat(uploadForm.width) : 0,
          height: uploadForm.height ? parseFloat(uploadForm.height) : 0,
          dimension_unit: uploadForm.dimension_unit || 'cm',
          image_url: uploadForm.image_url,
          status: 'published',
        });
        toastSuccess('Artwork uploaded successfully!');
      }

      setShowUploadForm(false);
      setUploadForm({
        title: '',
        description: '',
        category: '',
        medium: '',
        price: '',
        width: '',
        height: '',
        dimension_unit: 'cm',
        image_file: null,
        image_url: '',
        signatureText: '',
        tags: '',
        size: 'medium',
      });

      onArtworkUploaded();
    } catch (error) {
      console.error('Error uploading artwork:', error);

      if (error.status === 402) {
        toastError('Payment settings required. Please complete your payment information to upload artwork.');
        setTimeout(() => navigate('/artist/payment-settings'), 1500);
      } else if (error.status === 409) {
        toastError(error.message || 'Duplicate artwork detected. Please upload a different image.');
      } else if (error.status === 422) {
        toastError(error.message || 'Watermarked or copyrighted images are not allowed.');
      } else if (error.message && error.message.toLowerCase().includes('appears similar')) {
        toastError('Similar Image Detected: This artwork appears similar to an existing artwork. Please upload a different piece.');
      } else {
        toastError(error.message || 'Failed to upload artwork. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleEditArtwork = (artwork) => {
    const artworkId = artwork._id || artwork.id;
    setEditingArtwork(artworkId);
    setEditForm({
      title: artwork.title || '',
      description: artwork.description || '',
      category: artwork.category || '',
      price: artwork.price || '',
      width: artwork.width || '',
      height: artwork.height || '',
      dimension_unit: artwork.dimension_unit || 'cm',
    });
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateArtwork(editingArtwork, {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        price: parseFloat(editForm.price),
        width: editForm.width ? parseFloat(editForm.width) : 0,
        height: editForm.height ? parseFloat(editForm.height) : 0,
        dimension_unit: editForm.dimension_unit || 'cm',
      });
      setEditingArtwork(null);
      onArtworkUploaded();
    } catch (error) {
      console.error('Error updating artwork:', error);
      toastError(error.message || 'Failed to update artwork. Please try again.');
    }
  };

  const handleDeleteArtwork = async (artworkId) => {
    const artwork = artworks.find(a => (a._id || a.id) === artworkId);
    setDeleteModal({ 
      isOpen: true, 
      artworkId: artworkId,
      artworkTitle: artwork?.title || 'this artwork'
    });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteArtwork(deleteModal.artworkId);
      onArtworkDeleted(deleteModal.artworkId);
      setDeleteModal({ isOpen: false, artworkId: null, artworkTitle: '' });
    } catch (error) {
      console.error('Error deleting artwork:', error);
      toastError(error.message || 'Failed to delete artwork. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">My Artworks ({artworks?.length || 0})</h3>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Artwork
        </button>
      </div>

      {showUploadForm && (
        <form onSubmit={handleUploadArtwork} className="bg-gray-50 p-6 rounded-lg mb-6">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Artwork Title"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              className="px-4 py-2 border rounded-lg"
              required
            />
            <select
              value={uploadForm.category}
              onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
              className="px-4 py-2 border rounded-lg"
              required
            >
              <option value="">Select Category</option>
              <option value="abstract">Abstract</option>
              <option value="landscapes">Landscapes</option>
              <option value="portraits">Portraits</option>
              <option value="mixed media">Mixed Media</option>
              <option value="digital">Digital</option>
              <option value="sculpture">Sculpture</option>
            </select>
            <input
              type="number"
              placeholder="Price (₹)"
              value={uploadForm.price}
              onChange={(e) => setUploadForm({ ...uploadForm, price: e.target.value })}
              className="px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
              <input
                type="number"
                placeholder="Width"
                value={uploadForm.width}
                onChange={(e) => setUploadForm({ ...uploadForm, width: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                step="0.1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
              <input
                type="number"
                placeholder="Height"
                value={uploadForm.height}
                onChange={(e) => setUploadForm({ ...uploadForm, height: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                step="0.1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={uploadForm.dimension_unit}
                onChange={(e) => setUploadForm({ ...uploadForm, dimension_unit: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="cm">Centimeters (cm)</option>
                <option value="m">Meters (m)</option>
                <option value="inches">Inches</option>
              </select>
            </div>
          </div>

          <textarea
            placeholder="Description"
            value={uploadForm.description}
            onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg mb-4"
            rows={3}
          />

          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={uploadForm.tags}
            onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />

          <div className="space-y-4 mb-4">
            <input
              type="url"
              placeholder="Image URL (optional if file is provided)"
              value={uploadForm.image_url}
              onChange={(e) => setUploadForm({ ...uploadForm, image_url: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Signature text (optional if no signature image)"
              value={uploadForm.signatureText}
              onChange={(e) => setUploadForm({ ...uploadForm, signatureText: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadForm({ ...uploadForm, image_file: e.target.files[0] })}
              className="w-full px-4 py-2 border rounded-lg"
              required={!uploadForm.image_url}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadForm({
                  title: '',
                  description: '',
                  category: '',
                  medium: '',
                  price: '',
                  width: '',
                  height: '',
                  dimension_unit: 'cm',
                  image_file: null,
                  image_url: '',
                  signatureText: '',
                  tags: '',
                  size: 'medium',
                });
              }}
              className="px-4 py-2 border rounded-lg"
            >
              Reset
            </button>
          </div>
        </form>
      )}

      {artworks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No artworks uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {artworks.map((art) => (
            <div key={art._id || art.id} className="bg-white rounded-lg overflow-hidden shadow-sm border relative group">
              <div className="relative">
                <img
                  src={getImageUrl(art.image_url || art.watermarked_image_url || art.watermarkedImage) || 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg'}
                  alt={art.title}
                  className="w-full h-48 object-cover cursor-default"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';
                  }}
                />

                <div className="absolute top-2 right-2 flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-30 pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditArtwork(art);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full transition-colors shadow-lg border-2 border-white cursor-pointer"
                    title="Edit artwork"
                    type="button"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteArtwork(art._id || art.id);
                    }}
                    className="bg-amber-500 hover:bg-red-600 text-white p-3 rounded-full transition-colors shadow-lg border-2 border-white cursor-pointer"
                    title="Delete artwork"
                    type="button"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                {editingArtwork === (art._id || art.id) ? (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                        rows="2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Category</option>
                        <option value="abstract">Abstract</option>
                        <option value="landscapes">Landscapes</option>
                        <option value="portraits">Portraits</option>
                        <option value="mixed media">Mixed Media</option>
                        <option value="digital">Digital</option>
                        <option value="sculpture">Sculpture</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Size (Width × Height)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editForm.width}
                          onChange={(e) => setEditForm({ ...editForm, width: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Width"
                          step="0.1"
                          min="0"
                        />
                        <span className="flex items-center text-gray-500">×</span>
                        <input
                          type="number"
                          value={editForm.height}
                          onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Height"
                          step="0.1"
                          min="0"
                        />
                        <select
                          value={editForm.dimension_unit}
                          onChange={(e) => setEditForm({ ...editForm, dimension_unit: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="cm">cm</option>
                          <option value="m">m</option>
                          <option value="inches">in</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center justify-center font-medium"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingArtwork(null)}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-md flex items-center justify-center font-medium"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="font-semibold text-lg">{art.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{art.description || 'No description'}</p>
                    <p className="text-sm text-purple-600 capitalize">{art.category || 'General'}</p>
                    {(art.width || art.height) && (
                      <p className="text-sm text-gray-500 mt-1">
                        Size: {art.width || '?'} × {art.height || '?'} {art.dimension_unit || 'cm'}
                      </p>
                    )}
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      ₹{Number(art.price).toLocaleString('en-IN')}
                    </p>
                    <div className="mt-4 flex items-center gap-2 sm:hidden">
                      <button
                        onClick={() => handleEditArtwork(art)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md flex items-center justify-center font-medium"
                        type="button"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteArtwork(art._id || art.id)}
                        className="flex-1 bg-amber-500 hover:bg-red-600 text-white px-3 py-2 rounded-md flex items-center justify-center font-medium"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, artworkId: null, artworkTitle: '' })}
        onConfirm={confirmDelete}
        title="Delete Artwork"
        message={`Are you sure you want to delete "${deleteModal.artworkTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleting}
      />
    </div>
  );
};

export default ArtistArtworksTab;
