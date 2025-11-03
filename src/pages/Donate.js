// ✅ FILE: src/pages/Donate.js (Redirect after success → My Activity)
import React, { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
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

const CONDITIONS = ["excellent", "good", "fair", "poor"];
const DELIVERY = ["pickup", "delivery"];
const WINDOW_OPTIONS_HOURS = [
  { value: 24, label: "24h" },
  { value: 48, label: "48h" },
  { value: 72, label: "72h" },
];

export default function Donate() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "good",
    delivery: "pickup",
    type: "free",
    price: "",
    windowHours: 48,
    pickupLocation: "",
  });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isPremium = form.type === "premium";

  const canSubmit = useMemo(() => {
    if (!form.title.trim() || !form.description.trim() || !form.category)
      return false;
    if (form.delivery === "pickup" && !form.pickupLocation.trim()) return false;
    if (isPremium) {
      const n = Number(form.price);
      if (!Number.isFinite(n) || n < 100) return false;
    } else {
      if (!form.windowHours || Number.isNaN(Number(form.windowHours)))
        return false;
    }
    if (images.length < 2 || images.length > 4) return false;
    return true;
  }, [form, images, isPremium]);

  /* ------------------------- Input Handlers -------------------------- */
    // ✅ Text Sanitization (allows spaces & punctuation safely)
  const sanitizeText = (val) =>
    val
      .replace(/[^a-zA-Z0-9\s.,!()&'":;/-]/g, "") // allow letters, numbers, punctuation & spaces
      .replace(/\s{2,}/g, " ") // collapse multiple spaces
      .trim();

    // ✅ Keep price strictly numeric
    const onChange = (e) => {
    const { name, value } = e.target;
    const safeValue =
      name === "price"
        ? value.replace(/[^\d]/g, "") // numbers only for price
        : sanitizeText(value); // clean text but allow spaces
    setForm((f) => ({ ...f, [name]: safeValue }));
  };

  // ✅ File upload handler (safe & limited)
  const onFiles = (e) => {
    setErrorMsg("");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Validate type & size (≤5 MB each)
    const valid = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
    );

    if (valid.length < files.length) {
      setErrorMsg("Some files were invalid or exceeded 5 MB.");
    }

    // Limit to 4 images total
    setImages((prev) => [...prev, ...valid].slice(0, 4));
  };

  // ✅ Remove selected image
  const removeImage = (idx) => setImages((arr) => arr.filter((_, i) => i !== idx));

  // ✅ Upload all images & return URLs
  const uploadAll = async (donationId) => {
    const urls = [];

    for (const f of images) {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const filename = `${Date.now()}-${uuidv4()}.${ext}`;
      const path = `donations/${donationId}/${filename}`;
      const r = ref(storage, path);

      await uploadBytes(r, f, { contentType: f.type });
      const url = await getDownloadURL(r);
      urls.push(url);
    }

    return urls;
  };

  /* ------------------------- Submit Logic -------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!currentUser) {
      setErrorMsg(t("unauthorized") || "Please log in to continue.");
      return;
    }
    if (!canSubmit) {
      setErrorMsg("Please complete all required fields before donating.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const requestWindowEnd =
        form.type === "free"
          ? Timestamp.fromDate(
              new Date(Date.now() + Number(form.windowHours) * 60 * 60 * 1000)
            )
          : null;
      const priceNumber = isPremium ? Number(form.price) : null;

      const base = {
        donorId: currentUser.uid,
        donorEmail: currentUser.email || null,
        donorType: "user",
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        delivery: form.delivery,
        pickupLocation: form.pickupLocation?.trim() || "",
        type: form.type,
        accessType: form.type,
        isPremium,
        price: priceNumber,
        priceJPY: priceNumber,
        premiumPrice: priceNumber,
        currency: "JPY",
        status: "active",
        approved: false,
        verified: false,
        images: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requestWindowEnd,
      };

      const donationRef = await addDoc(collection(db, "donations"), base);
      const imageUrls = await uploadAll(donationRef.id);
      await updateDoc(doc(db, "donations", donationRef.id), {
        images: imageUrls,
        updatedAt: serverTimestamp(),
      });

      toast.success("🎉 Donation submitted successfully!");
      setSuccessMsg("Item donated successfully ✅");

      // ⏳ Small delay before redirect
      setTimeout(() => {
        navigate("/my-activity");
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Donation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------- UI -------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 relative w-full overflow-x-hidden">
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
          {t("donate") || "Donate an Item"}
        </h1>

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
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 font-sans text-sm sm:text-base text-gray-700"
        >
          {/* --- Item Details --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block font-medium mb-1">
                  {t("itemTitle") || "Title"} *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  required
                  placeholder="e.g., Wooden table or baby stroller"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 tracking-wide"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-medium mb-1">
                  {t("itemDescription") || "Description"} *
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  required
                  rows={5}
                  placeholder="Describe condition, size, and any defects..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 tracking-wide"
                />
              </div>

              {/* Images */}
              <div>
                <label className="block font-medium mb-1">
                  {t("itemImages") || "Images"} (2–4)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFiles}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  JPEG/PNG • Max 5MB each • Upload 2–4 images.
                </p>
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
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side */}
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
                      {c.labelKey ? t(c.labelKey) : c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery */}
              <div>
                <label className="block font-medium mb-1">Delivery *</label>
                <div className="flex gap-4">
                  {DELIVERY.map((method) => (
                    <label key={method} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="delivery"
                        value={method}
                        checked={form.delivery === method}
                        onChange={onChange}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="capitalize">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pickup Location */}
              {form.delivery === "pickup" && (
                <div>
                  <label className="block font-medium mb-1">
                    Pickup Location *
                  </label>
                  <input
                    name="pickupLocation"
                    value={form.pickupLocation}
                    onChange={onChange}
                    placeholder="Enter pickup address or landmark"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400"
                  />
                </div>
              )}

              {/* Free / Premium */}
              <div>
                <label className="block font-medium mb-1">Listing Type *</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="free"
                      checked={form.type === "free"}
                      onChange={onChange}
                      className="text-indigo-600"
                    />
                    <span>Free (donation)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="premium"
                      checked={form.type === "premium"}
                      onChange={onChange}
                      className="text-indigo-600"
                    />
                    <span>Premium (for sale)</span>
                  </label>
                </div>
              </div>

              {/* Price (Premium) */}
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
                </div>
              )}

              {/* Request window */}
              {form.type === "free" && (
                <div>
                  <label className="block font-medium mb-1">Request Window *</label>
                  <div className="flex gap-2">
                    {WINDOW_OPTIONS_HOURS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${
                          Number(form.windowHours) === opt.value
                            ? "bg-indigo-50 border-indigo-400"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="windowHours"
                          value={opt.value}
                          checked={Number(form.windowHours) === opt.value}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              windowHours: Number(e.target.value),
                            }))
                          }
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Donate Button */}
          <div className="pt-6 text-right">
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Donating…" : "Donate"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
