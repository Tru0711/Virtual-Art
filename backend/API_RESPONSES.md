# API Response Reference - Duplicate Detection

## Success Response

### Artwork Upload Success
**Status:** `201 Created`

```json
{
  "success": true,
  "message": "Artwork uploaded successfully! 🎨",
  "artwork": {
    "_id": "65a1b2c3d4e5f6789abcdef0",
    "title": "Silent Flight",
    "description": "A modern abstract piece...",
    "category": "digital",
    "price": 5000,
    "image_url": "https://virtual-art-backend.onrender.com/uploads/1234567890-artwork.jpg",
    "imageHash": "a1b2c3d4e5f6789...64chars",
    "perceptualHash": "1f3a5b7c9d2e4f6a",
    "artist_id": {
      "_id": "65a1b2c3d4e5f6789abcdef1",
      "full_name": "Artist Name"
    },
    "status": "published",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Error Responses

### 1. Exact Duplicate Detected
**Status:** `409 Conflict`

```json
{
  "success": false,
  "message": "This image has already been uploaded. Duplicate images are not allowed.",
  "duplicateArtwork": {
    "id": "65a1b2c3d4e5f6789abcdef2",
    "title": "Previous Upload Title",
    "uploadedAt": "2024-01-14T15:20:00.000Z"
  }
}
```

**What happened:**
- Exact same image file uploaded before
- SHA-256 hash matched existing artwork
- File was automatically deleted from server

**User action:**
- Choose a completely different image
- Do not rename and retry - won't work!

---

### 2. Similar Image Detected
**Status:** `409 Conflict`

```json
{
  "success": false,
  "message": "A very similar image has already been uploaded. Please upload a different artwork.",
  "similarArtwork": {
    "id": "65a1b2c3d4e5f6789abcdef3",
    "title": "Similar Artwork Title",
    "uploadedAt": "2024-01-13T09:45:00.000Z"
  }
}
```

**What happened:**
- Perceptual hash detected visual similarity
- Hamming distance ≤ 8 (images are very similar)
- File was automatically deleted from server

**Common causes:**
- Same photo with slight edits
- Cropped version of existing image
- Image with added watermark/text
- Re-exported with different quality

**User action:**
- Upload a significantly different artwork
- Create new original content

---

### 3. Validation Error (Missing Fields)
**Status:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Missing required fields: title, category, price"
}
```

**What happened:**
- Required form fields not provided
- File was automatically deleted

**User action:**
- Fill in all required fields
- Retry upload

---

### 4. Missing Image File
**Status:** `400 Bad Request`

```json
{
  "success": false,
  "message": "No image file provided"
}
```

**What happened:**
- No file attached to upload request
- Form submitted without selecting image

**User action:**
- Select an image file
- Verify file input is working

---

### 5. Unauthorized Upload
**Status:** `403 Forbidden`

```json
{
  "success": false,
  "message": "Only artists can upload artworks"
}
```

**What happened:**
- Non-artist user attempted upload
- File was automatically deleted

**User action:**
- Register as an artist
- Switch to artist account

---

### 6. Database Duplicate Key Error (Race Condition)
**Status:** `409 Conflict`

```json
{
  "success": false,
  "message": "This image has already been uploaded. Duplicate images are not allowed."
}
```

**What happened:**
- Two identical uploads happened simultaneously
- MongoDB unique index caught the duplicate
- Rare occurrence

**User action:**
- Don't retry - first upload succeeded
- Refresh to see uploaded artwork

---

### 7. Server Error
**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "message": "Failed to upload artwork. Please try again.",
  "error": "Error details (only in development mode)"
}
```

**What happened:**
- Unexpected server error
- File processing failed
- Database connection issue
- File was automatically deleted

**User action:**
- Retry upload
- Check file format (should be jpg, png, webp, gif)
- Check file size (should be < 5MB)
- Contact support if persists

---

## Frontend Error Handling

### Recommended Implementation

```javascript
try {
  const response = await api.uploadArtwork(formData);
  
  if (response.success) {
    // Show success message
    showSuccessMessage(response.message);
    // Update UI with new artwork
    addArtworkToList(response.artwork);
  }
  
} catch (error) {
  // Parse error response
  const errorMessage = error.message || 'Upload failed';
  
  if (errorMessage.includes('already been uploaded')) {
    // Exact duplicate
    showDuplicateError(
      'This exact image already exists in the gallery.',
      'Please choose a different image to upload.'
    );
    
  } else if (errorMessage.includes('similar image')) {
    // Similar image
    showSimilarImageError(
      'A very similar image was found.',
      'Please upload a more unique artwork.'
    );
    
  } else if (errorMessage.includes('Missing required fields')) {
    // Validation error
    showValidationError('Please fill in all required fields.');
    
  } else if (errorMessage.includes('Only artists')) {
    // Authorization error
    showAuthError('You need to be registered as an artist to upload.');
    
  } else {
    // Generic error
    showGenericError('Upload failed. Please try again.');
  }
}
```

### Error Display Recommendations

1. **Exact Duplicate**
   - Icon: ⚠️ Warning
   - Color: Yellow/Orange
   - Action: "Choose Different Image" button
   - Optional: Show link to existing artwork

2. **Similar Image**
   - Icon: 🔍 Similar
   - Color: Blue/Info
   - Action: "Upload Different Artwork" button
   - Optional: Show similarity score

3. **Validation Error**
   - Icon: ❌ Error
   - Color: Red
   - Action: Highlight missing fields
   - Keep form data intact

4. **Success**
   - Icon: ✅ Success
   - Color: Green
   - Action: Clear form
   - Show uploaded artwork

---

## HTTP Status Codes Summary

| Code | Meaning | Retry? |
|------|---------|--------|
| 201 | Success - Artwork created | N/A |
| 400 | Bad request - Validation failed | Yes (after fixing) |
| 403 | Forbidden - Not an artist | No |
| 409 | Conflict - Duplicate/Similar | No (choose different image) |
| 500 | Server error | Yes |

---

## Testing Examples

### cURL - Upload Artwork
```bash
curl -X POST http://localhost:5000/api/artworks/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@path/to/image.jpg" \
  -F "title=Test Artwork" \
  -F "description=Test description" \
  -F "category=digital" \
  -F "price=1000"
```

### cURL - Test Duplicate (Should Fail)
```bash
# Upload same image again
curl -X POST http://localhost:5000/api/artworks/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@path/to/same-image.jpg" \
  -F "title=Different Title" \
  -F "category=digital" \
  -F "price=2000"

# Expected: 409 Conflict with duplicate message
```

### Postman Collection

```json
{
  "name": "Upload Artwork",
  "request": {
    "method": "POST",
    "url": "{{baseUrl}}/api/artworks/upload",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{token}}"
      }
    ],
    "body": {
      "mode": "formdata",
      "formdata": [
        {
          "key": "image",
          "type": "file",
          "src": "path/to/image.jpg"
        },
        {
          "key": "title",
          "value": "Test Artwork"
        },
        {
          "key": "category",
          "value": "digital"
        },
        {
          "key": "price",
          "value": "1000"
        }
      ]
    }
  }
}
```

---

## Monitoring & Logging

### What Gets Logged

```javascript
// Upload request received
console.log('Upload request received');
console.log('User:', req.user);
console.log('Body:', req.body);
console.log('File:', req.file);

// Hash generation
console.log('Starting duplicate detection...');
console.log('Generated SHA-256 hash:', imageHash);
console.log('Generated perceptual hash:', perceptualHash);

// Duplicate detection
console.log('Exact duplicate detected:', exactDuplicate._id);
console.log('Similar image detected:', artwork._id);
console.log('No duplicates found, proceeding with upload...');

// Success
console.log('Artwork saved successfully');

// Errors
console.error('Upload error:', error);
console.error('Error deleting file:', err);
```

### Useful Metrics to Track

1. **Duplicate Detection Rate**
   - Exact duplicates caught
   - Similar images caught
   - False positives (similar but should allow)

2. **Performance**
   - Hash generation time
   - Database query time
   - Total upload time

3. **Storage Saved**
   - Number of duplicate uploads prevented
   - Estimated storage saved (MB/GB)

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**API Base URL**: `/api/artworks`
