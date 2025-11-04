// ✅ FILE: src/pages/AdminDonate.js
import React, { useMemo, useState, useEffect } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

const CATEGORIES = [
  { value: "", labelKey: "itemCategory" },
  { value: "furniture", label: "Furniture" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "books", label: "Books" },
  { value: "other", label: "Other" },
];

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "Pickup Only" },
  { value: "delivery", label: "Delivery Available" },
  { value: "both", label: "Pickup or Delivery" },
];

export default function AdminDonate() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdminCheck, setLoadingAdminCheck] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "excellent",
    delivery: "both",
    type: "free",
    price: "",
    pickupLocation: "",
    // Admin-specific fields
    sponsoredBy: "Freebies Japan",
    durationHours: 72,
  });

  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isPremium = form.type === "premium";

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setLoadingAdminCheck(false);
        return;
      }
      
      try {
        const adminDoc = await getDoc(doc(db, "admins", currentUser.uid));
        if (adminDoc.exists()) {
          setIsAdmin(true);
        } else {
          toast.error("Admin access required");
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast.error("Error verifying admin access");
        navigate("/");
      } finally {
        setLoadingAdminCheck(false);
      }
    };

    checkAdminStatus();
  }, [currentUser, navigate]);

  const canSubmit = useMemo(() => {
    if (!form.title.trim() || !form.description.trim() || !form.category)
      return false;
    
    if (form.title.trim().length > 100 || form.description.trim().length > 1000)
      return false;
    
    if (!form.pickupLocation.trim()) return false;
    
    if (isPremium) {
      const n = Number(form.price);
      if (!Number.isFinite(n) || n < 100) return false;
    }
    
    if (images.length < 1 || images.length > 10) return false;
    
    return true;
  }, [form, images, isPremium]);

  /* ------------------------- Input Handlers -------------------------- */
  const sanitizeText = (val = "") => {
    return val
      .replace(/[^a-zA-Z0-9\s.,!()&'":;/-]/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const onChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "select-one" || type === "radio") {
      setForm((f) => ({ ...f, [name]: value }));
      return;
    }

    let newValue = value;
    if (name === "price") {
      newValue = value.replace(/[^\d]/g, "");
    } else {
      newValue = sanitizeText(value);
    }

    setForm((f) => ({ ...f, [name]: newValue }));
  };

  /* ------------------------- File Upload -------------------------- */
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
    );
    
    if (valid.length < files.length) {
      setErrorMsg("Some files were invalid or exceeded 5 MB.");
    }
    
    const newImages = [...images, ...valid].slice(0, 10); // Admin can upload up to 10 images
    setImages(newImages);
    
    if (newImages.length >= 1 && errorMsg.includes("image")) {
      setErrorMsg("");
    }
  };

  const removeImage = (idx) => {
    setImages((arr) => arr.filter((_, i) => i !== idx));
  };

  const uploadAll = async (donationId) => {
    console.log("🖼️ Starting upload of", images.length, "images...");
    const urls = [];
    
    for (const [index, file] of images.entries()) {
      try {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const filename = `${Date.now()}-${uuidv4()}.${ext}`;
        const path = `donations/${donationId}/${filename}`;
        const storageRef = ref(storage, path);
        
        await uploadBytes(storageRef, file, { contentType: file.type });
        const downloadURL = await getDownloadURL(storageRef);
        urls.push(downloadURL);
      } catch (error) {
        console.error(`❌ Failed to upload image ${index + 1}:`, error);
        throw new Error(`Failed to upload image: ${file.name}`);
      }
    }
    
    console.log("🎉 All images uploaded. URLs:", urls);
    return urls;
  };

  /* ------------------------- Submit (Admin Version) -------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !isAdmin) return;

    if (!currentUser) {
      setErrorMsg("Please log in to continue.");
      return;
    }
    if (!canSubmit) {
      if (images.length < 1) {
        setErrorMsg("Please upload at least 1 image.");
      } else if (images.length > 10) {
        setErrorMsg("Maximum 10 images allowed.");
      } else if (form.title.trim().length > 100) {
        setErrorMsg("Title must be 100 characters or less.");
      } else if (form.description.trim().length > 1000) {
        setErrorMsg("Description must be 1000 characters or less.");
      } else {
        setErrorMsg("Please complete all required fields.");
      }
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Generate donation ID for image organization
      const donationId = uuidv4();
      
      // 2. Upload all images first
      const imageUrls = await uploadAll(donationId);
      
      // 3. Verify we have at least 1 image
      if (imageUrls.length < 1) {
        throw new Error("At least 1 image is required");
      }

      // 4. Prepare ADMIN donation data
      const priceNumber = isPremium && form.price ? Number(form.price) : null;
      const requestWindowEnd = Timestamp.fromDate(
        new Date(Date.now() + Number(form.durationHours) * 60 * 60 * 1000)
      );

      const donationData = {
        // Admin identification
        donorId: currentUser.uid,
        donorEmail: currentUser.email,
        donorType: "admin",
        sponsoredBy: form.sponsoredBy,
        
        // Auto-verified and approved for admin donations
        verified: true,
        approved: true,
        
        // Content (from form)
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        delivery: form.delivery,
        pickupLocation: form.pickupLocation.trim(),
        
        // Listing type
        type: form.type,
        isPremium: isPremium,
        price: priceNumber,
        currency: "JPY",
        
        // Status - starts as active and verified
        status: "active",
        
        // Images
        images: imageUrls,
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Admin-specific fields
        durationHours: Number(form.durationHours),
        expiryAt: requestWindowEnd,
        requestWindowEnd: requestWindowEnd,
        availabilityCycle: 1,
      };

      console.log("📦 Final ADMIN donation data:", donationData);

      // 5. Single write to Firestore
      await addDoc(collection(db, "donations"), donationData);

      toast.success("🎉 Admin donation submitted successfully!");
      setSuccessMsg("Sponsored item created successfully ✅");

      setTimeout(() => navigate("/admin-dashboard"), 1200);
      
    } catch (err) {
      console.error("❌ Submission error:", err);
      setErrorMsg(err?.message || "Donation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAdminCheck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  /* ------------------------- UI -------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Create Sponsored Donation
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Create a verified sponsored item as Freebies Japan
          </p>
        </div>

        {successMsg && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl p-4 mb-6">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-xl p-4 mb-6">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 text-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Section */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block font-medium mb-1">
                  Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  required
                  maxLength={100}
                  placeholder="e.g., Premium Electronics Bundle"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {form.title.length}/100 characters
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-medium mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  required
                  maxLength={1000}
                  rows={5}
                  placeholder="Describe this sponsored item in detail..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {form.description.length}/1000 characters
                </div>
              </div>

              {/* Images - Admin can upload 1-10 images */}
              <div>
                <label className="block font-medium mb-1">
                  Images (1–10) *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFiles}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Select 1 to 10 images. Each file must be under 5MB.
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`Preview ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {images.length > 0 && images.length < 1 && (
                  <p className="text-red-500 text-sm mt-2">
                    ⚠️ At least 1 image is required
                  </p>
                )}
                {images.length === 10 && (
                  <p className="text-green-500 text-sm mt-2">
                    ✓ Maximum images reached (10/10)
                  </p>
                )}
              </div>
            </div>

            {/* Right Section */}
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block font-medium mb-1">Category *</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.labelKey || c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Options */}
              <div>
                <label className="block font-medium mb-1">Delivery Options *</label>
                <select
                  name="delivery"
                  value={form.delivery}
                  onChange={onChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {DELIVERY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pickup Location */}
              <div>
                <label className="block font-medium mb-1">Pickup Location/Instructions *</label>
                <input
                  name="pickupLocation"
                  value={form.pickupLocation}
                  onChange={onChange}
                  required
                  placeholder="e.g., Freebies Japan Office - Shibuya, or Delivery instructions"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Admin Specific Fields */}
              <div className="border-t pt-4">
                <label className="block font-medium text-lg mb-3">
                  🏢 Admin Settings
                </label>

                {/* Sponsored By */}
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Sponsored By</label>
                  <input
                    name="sponsoredBy"
                    value={form.sponsoredBy}
                    onChange={onChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Duration */}
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Listing Duration</label>
                  <select
                    name="durationHours"
                    value={form.durationHours}
                    onChange={onChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                    <option value={96}>96 hours</option>
                  </select>
                </div>
              </div>

              {/* Listing Type */}
              <div>
                <label className="block font-medium mb-1">Listing Type *</label>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="free"
                      checked={form.type === "free"}
                      onChange={onChange}
                      className="accent-indigo-600 focus:ring-indigo-500 w-3 h-3"
                    />
                    <span>Free (sponsored donation)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="premium"
                      checked={form.type === "premium"}
                      onChange={onChange}
                      className="accent-indigo-600 focus:ring-indigo-500 w-3 h-3"
                    />
                    <span>Premium (sponsored sale)</span>
                  </label>
                </div>
              </div>

              {/* Price */}
              {isPremium && (
                <div>
                  <label className="block font-medium mb-1">Price (JPY) *</label>
                  <input
                    name="price"
                    type="number"
                    min="100"
                    value={form.price}
                    onChange={onChange}
                    required
                    placeholder="e.g., 1500"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Minimum price: ¥100
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6 text-right">
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors duration-200"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Sponsored Item...
                </span>
              ) : (
                "Create Sponsored Item"
              )}
            </button>
            
            {submitting && (
              <p className="text-sm text-gray-600 mt-2">
                Uploading {images.length} images... This may take a moment.
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}