// ✅ FILE: src/components/Donation/DonationForm.js
import React, { useState } from "react";
import { db, storage } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { useAuth } from "../../contexts/AuthContext";

const DonationForm = () => {
  const { currentUser } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [delivery, setDelivery] = useState("pickup");
  const [pickupLocation, setPickupLocation] = useState("");
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* 🖼️ Validate image count */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 2 || files.length > 4) {
      setError("Please upload 2 to 4 images.");
    } else {
      setError("");
      setImages(files);
    }
  };

  /* 🖼️ Compress + upload all images to Firebase Storage */
  const handleImageUpload = async (files, donationId) => {
    const urls = [];
    for (let file of files) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });
        const uniqueName = `donations/${donationId}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, uniqueName);
        await uploadBytes(storageRef, compressed);
        const downloadUrl = await getDownloadURL(storageRef);
        urls.push(downloadUrl);
      } catch (error) {
        console.error("❌ Compression or upload failed:", error);
      }
    }
    return urls;
  };

  /* 🧾 Handle submission */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentUser) {
      return setError("Please log in to submit a donation.");
    }

    if (!title.trim() || !description.trim() || !category) {
      return setError("Please complete all required fields.");
    }

    if (delivery === "pickup" && !pickupLocation.trim()) {
      return setError("Pickup location is required for pickup delivery.");
    }

    if (images.length < 2 || images.length > 4) {
      return setError("Please upload 2 to 4 images.");
    }

    try {
      setLoading(true);

      // Step 1️⃣: create base donation entry
      const donationRef = await addDoc(collection(db, "donations"), {
        donorId: currentUser.uid,
        donorEmail: currentUser.email || null,
        donorType: "user",
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        delivery,
        pickupLocation: delivery === "pickup" ? pickupLocation.trim() : "",
        type: "free",
        accessType: "free",
        isPremium: false,
        price: null,
        priceJPY: null,
        premiumPrice: null,
        currency: "JPY",
        status: "active",
        approved: false,
        verified: false,
        images: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Step 2️⃣: upload images and update doc
      const imageUrls = await handleImageUpload(images, donationRef.id);
      await donationRef.update({ images: imageUrls, updatedAt: serverTimestamp() });

      // Step 3️⃣: reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setCondition("");
      setDelivery("pickup");
      setPickupLocation("");
      setImages([]);
      setError("");
      alert("🎁 Donation submitted successfully!");
    } catch (err) {
      console.error("Submission error:", err);
      setError("Failed to submit donation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-md space-y-4"
    >
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
        <option value="excellent">Excellent</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Poor</option>
      </select>

      <select
        value={delivery}
        onChange={(e) => setDelivery(e.target.value)}
        required
        className="w-full border rounded p-2"
      >
        <option value="pickup">Pickup</option>
        <option value="delivery">Delivery</option>
      </select>

      {delivery === "pickup" && (
        <input
          type="text"
          placeholder="Pickup Location"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          required
          className="w-full border rounded p-2"
        />
      )}

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
        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        {loading ? "Submitting..." : "Submit Donation"}
      </button>
    </form>
  );
};

export default DonationForm;
