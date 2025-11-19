// ✅ FILE: src/pages/AdminDonate.js (FINAL — Mobile-First + AdminLayout UI + Responsive)
import React, { useMemo, useState, useEffect } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import AdminLayout from "../components/Admin/AdminLayout"; // ⭐ NEW — unified admin wrapper

/* ------------------------------------------------------
 * CONSTANTS
 * ------------------------------------------------------ */
const CATEGORIES = [
  { value: "", label: "Select Category" },
  { value: "furniture", label: "Furniture" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "books", label: "Books" },
  { value: "home", label: "Home Goods" },
  { value: "other", label: "Other" },
];

const SIZES = [
  { value: "small", label: "Small (e.g., books, clothing)" },
  { value: "medium", label: "Medium (e.g., small electronics)" },
  { value: "large", label: "Large (e.g., furniture, appliances)" },
  { value: "x-large", label: "Extra Large (e.g., sofa, refrigerator)" },
];

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "Pickup Only" },
  { value: "delivery", label: "Delivery Available" },
  { value: "both", label: "Pickup or Delivery" },
];

// Debug helper
const debugAdminStatus = (user) => {
  console.log("🔍 ADMIN STATUS DEBUG:", {
    email: user?.email,
    uid: user?.uid,
    isGnetstelecom: user?.email?.includes("gnetstelecom"),
    emailVerified: user?.emailVerified,
  });
};

/* ------------------------------------------------------
 * COMPONENT
 * ------------------------------------------------------ */
export default function AdminDonate() {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

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
    sponsoredBy: "Freebies Japan",
    durationHours: 72,
    size: "medium",
    deliveryMin: "",
    deliveryMax: "",
  });

  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isPremium = form.type === "premium";

  /* ------------------------------------------------------
   * ADMIN CHECK
   * ------------------------------------------------------ */
  useEffect(() => {
    if (!currentUser) {
      setLoadingAdminCheck(false);
      return;
    }

    debugAdminStatus(currentUser);

    if (!isAdmin) {
      toast.error("Admin access required");
      navigate("/");
      return;
    }

    setLoadingAdminCheck(false);
  }, [currentUser, isAdmin, navigate]);

  /* ------------------------------------------------------
   * VALIDATION
   * ------------------------------------------------------ */
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

    if (form.delivery !== "pickup") {
      const min = Number(form.deliveryMin);
      const max = Number(form.deliveryMax);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min)
        return false;
    }

    return true;
  }, [form, images, isPremium]);

  /* ------------------------------------------------------
   * INPUT HANDLERS
   * ------------------------------------------------------ */
  const onChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "select-one" || type === "radio") {
      setForm((f) => ({ ...f, [name]: value }));
      return;
    }

    let newValue = value;
    if (["price", "deliveryMin", "deliveryMax"].includes(name)) {
      newValue = value.replace(/[^\d]/g, "");
    }

    setForm((f) => ({ ...f, [name]: newValue }));
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
    );

    if (valid.length < files.length) {
      setErrorMsg("Some files were invalid or exceeded 5MB.");
    }

    const newImages = [...images, ...valid].slice(0, 10);
    setImages(newImages);

    if (newImages.length >= 1 && errorMsg.includes("image")) {
      setErrorMsg("");
    }
  };

  const removeImage = (idx) =>
    setImages((arr) => arr.filter((_, i) => i !== idx));

  /* ------------------------------------------------------
   * UPLOAD
   * ------------------------------------------------------ */
  const uploadAll = async (donationId) => {
    const urls = [];

    for (const file of images) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const filename = `${Date.now()}-${uuidv4()}.${ext}`;
      const path = `donations/${donationId}/${filename}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);
      urls.push(downloadURL);
    }
    return urls;
  };

  /* ------------------------------------------------------
   * SUBMIT HANDLER
   * ------------------------------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || submitting) return;

    if (!currentUser) {
      setErrorMsg("Please log in.");
      return;
    }

    if (!canSubmit) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const donationId = uuidv4();
      const imageUrls = await uploadAll(donationId);

      const priceNumber = isPremium ? Number(form.price) : null;
      const expiry = Timestamp.fromDate(
        new Date(Date.now() + Number(form.durationHours) * 60 * 60 * 1000)
      );

      const donationData = {
        donorType: "admin",
        sponsoredBy: "admin", // 🔥 Firestore rule requirement
        donorId: currentUser.uid,
        donorEmail: currentUser.email,

        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        delivery: form.delivery,
        pickupLocation: form.pickupLocation.trim(),

        size: form.size,
        estimatedDelivery:
          form.delivery !== "pickup"
            ? {
                min: Number(form.deliveryMin),
                max: Number(form.deliveryMax),
              }
            : null,

        pickupAddress: {
          addressLine1: form.pickupLocation.trim(),
          city: "Tokyo",
          prefecture: "Tokyo",
          postalCode: "150-0001",
        },

        type: form.type,
        isPremium,
        price: priceNumber,
        currency: "JPY",

        status: "sponsored",
        isSponsored: true,
        featured: true,

        images: imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        durationHours: Number(form.durationHours),
        expiryAt: expiry,
        requestWindowEnd: expiry,
        availabilityCycle: 1,

        verified: true,
        approved: true,
      };

      await addDoc(collection(db, "donations"), donationData);

      toast.success("🎉 Sponsored item created successfully!");
      setSuccessMsg("Sponsored item created successfully.");

      setTimeout(() => navigate("/admin"), 1200);
    } catch (err) {
      console.error("❌ Submit error:", err);

      if (err.code === "permission-denied") {
        setErrorMsg(
          "❌ Admin permissions required. Please ensure you're logged in as an administrator."
        );
        toast.error("Admin permissions required");
      } else {
        setErrorMsg(err?.message || "Error creating sponsored item.");
        toast.error("Failed to create sponsored item");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------
   * LOADING / DENIED
   * ------------------------------------------------------ */
  if (loadingAdminCheck) {
    return (
      <AdminLayout title="Create Sponsored Item">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking admin access...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="Access Denied">
        <div className="p-6 text-center text-red-600 font-semibold">
          Admin privileges required.
        </div>
      </AdminLayout>
    );
  }

  /* ------------------------------------------------------
   * MAIN UI (Mobile-First + Responsive)
   * ------------------------------------------------------ */
  return (
    <AdminLayout title="Create Sponsored Item">
      <div className="w-full max-w-3xl mx-auto px-4 pb-32 md:pb-40">
        {/* Status Messages */}
        {successMsg && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg p-4 mb-4 text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-4 mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ----------------------------------------------
           * SECTION: BASIC INFORMATION
           * ---------------------------------------------- */}
          <section className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">
              Basic Information
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  required
                  maxLength={100}
                  placeholder="e.g., High Quality Furniture Set"
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {form.title.length}/100
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  rows={4}
                  onChange={onChange}
                  required
                  maxLength={1000}
                  placeholder="Describe this sponsored item..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {form.description.length}/1000
                </div>
              </div>

              {/* Mobile-first → 1 col, Tablet → 2 col */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={onChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Item Size *
                  </label>
                  <select
                    name="size"
                    value={form.size}
                    onChange={onChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {SIZES.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------
           * SECTION: DELIVERY INFORMATION
           * ---------------------------------------------- */}
          <section className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">
              Delivery Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Delivery Options *
                </label>
                <select
                  name="delivery"
                  value={form.delivery}
                  onChange={onChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {DELIVERY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.delivery !== "pickup" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Delivery Min (¥)
                    </label>
                    <input
                      name="deliveryMin"
                      type="number"
                      value={form.deliveryMin}
                      onChange={onChange}
                      required={form.delivery !== "pickup"}
                      placeholder="1000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Delivery Max (¥)
                    </label>
                    <input
                      name="deliveryMax"
                      type="number"
                      value={form.deliveryMax}
                      onChange={onChange}
                      required={form.delivery !== "pickup"}
                      placeholder="3000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Pickup Location *
                </label>
                <input
                  name="pickupLocation"
                  value={form.pickupLocation}
                  onChange={onChange}
                  required
                  placeholder="e.g., Freebies Japan Office - Shibuya"
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* ----------------------------------------------
           * SECTION: IMAGES
           * ---------------------------------------------- */}
          <section className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">
              Images
            </h2>

            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Images (1–10) *
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFiles}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                           file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 
                           hover:file:bg-purple-100"
              />

              <div className="text-xs text-gray-500 mt-1">
                Max 10 images — 5MB each.
              </div>

              {/* Mobile-first → 3 per row, Tablet → 4, Desktop → 6 */}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(img)}
                        className="w-full h-24 object-cover rounded-lg border"
                        alt="preview"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full
                                   w-6 h-6 flex items-center justify-center text-xs opacity-90"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ----------------------------------------------
           * SECTION: ADMIN SETTINGS
           * ---------------------------------------------- */}
          <section className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">
              Admin Settings
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sponsored By
                  </label>
                  <input
                    name="sponsoredBy"
                    value={form.sponsoredBy}
                    onChange={onChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Display name for users (internally always "admin")
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Listing Duration
                  </label>
                  <select
                    name="durationHours"
                    value={form.durationHours}
                    onChange={onChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
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
                <label className="block text-sm font-medium mb-2">
                  Listing Type *
                </label>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-sm p-3 border rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="free"
                      checked={form.type === "free"}
                      onChange={onChange}
                      className="accent-purple-600"
                    />
                    <span>Free (sponsored donation)</span>
                  </label>

                  <label className="flex items-center gap-3 text-sm p-3 border rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="premium"
                      checked={form.type === "premium"}
                      onChange={onChange}
                      className="accent-purple-600"
                    />
                    <span>Premium (sponsored sale)</span>
                  </label>
                </div>
              </div>

              {/* Premium Pricing */}
              {isPremium && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price (JPY) *
                  </label>
                  <input
                    name="price"
                    type="number"
                    min={100}
                    value={form.price}
                    onChange={onChange}
                    required
                    placeholder="1500"
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}
            </div>
          </section>
        </form>
      </div>

      {/* ------------------------------------------------------
       * STICKY SAFE-AREA SUBMIT BUTTON
       * ------------------------------------------------------ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 
                      pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          form="admin-donate-form"
          type="submit"
          disabled={submitting || !canSubmit}
          onClick={handleSubmit}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 
                     transition-all duration-200"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              Creating Sponsored Item...
            </span>
          ) : (
            "Create Sponsored Item"
          )}
        </button>

        {!canSubmit && !submitting && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Please complete all required fields
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
