// File: src/components/Donation/DonationForm.js
import React, { useState } from 'react';
import { db } from '../../firebase'; // Updated path from '../firebase' to '../../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

const DonationForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [delivery, setDelivery] = useState('');
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 2 || files.length > 4) {
      setError('Please upload 2 to 4 images.');
    } else {
      setError('');
      setImages(files);
    }
  };

  const handleImageUpload = async (files) => {
    const compressedUrls = [];
    const storage = getStorage();

    for (let file of files) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });
        const uniqueName = `donations/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, uniqueName);
        await uploadBytes(storageRef, compressed);
        const downloadUrl = await getDownloadURL(storageRef);
        compressedUrls.push(downloadUrl);
      } catch (error) {
        console.error('❌ Compression or upload failed:', error);
      }
    }
    return compressedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (images.length < 2 || images.length > 4) {
      return setError('Please upload 2 to 4 images.');
    }

    try {
      setLoading(true);
      const imageUrls = await handleImageUpload(images);

      await addDoc(collection(db, 'donations'), {
        title,
        description,
        category,
        condition,
        delivery,
        images: imageUrls,
        createdAt: serverTimestamp()
      });

      setTitle('');
      setDescription('');
      setCategory('');
      setCondition('');
      setDelivery('');
      setImages([]);
      alert('Donation submitted!');
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit donation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Donate an Item</h2>

      {error && <p className="text-red-500">{error}</p>}

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="w-full border rounded p-2"
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        className="w-full border rounded p-2"
      />

      <input
        type="text"
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        required
        className="w-full border rounded p-2"
      />

      <select
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        required
        className="w-full border rounded p-2"
      >
        <option value="">Select Condition</option>
        <option value="New">New</option>
        <option value="Gently Used">Gently Used</option>
        <option value="Heavily Used">Heavily Used</option>
      </select>

      <select
        value={delivery}
        onChange={(e) => setDelivery(e.target.value)}
        required
        className="w-full border rounded p-2"
      >
        <option value="">Delivery Method</option>
        <option value="Pickup">Pickup</option>
        <option value="Delivery">Delivery</option>
      </select>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
        className="w-full border rounded p-2"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Submitting...' : 'Submit Donation'}
      </button>
    </form>
  );
};

export default DonationForm;