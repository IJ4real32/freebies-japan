import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { ChevronDown } from "lucide-react";

/* -------------------- Constants -------------------- */
const CATEGORIES = [
  { value: "", labelKey: "itemCategory" },
  { value: "furniture", label: "Furniture" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "books", label: "Books" },
  { value: "other", label: "Other" },
];

const PREFECTURES = [
  "Hokkaido", "Aomori", "Iwate", "Miyagi", "Akita", "Yamagata", "Fukushima",
  "Ibaraki", "Tochigi", "Gunma", "Saitama", "Chiba", "Tokyo", "Kanagawa",
  "Niigata", "Toyama", "Ishikawa", "Fukui", "Yamanashi", "Nagano", "Gifu",
  "Shizuoka", "Aichi", "Mie", "Shiga", "Kyoto", "Osaka", "Hyogo", "Nara",
  "Wakayama", "Tottori", "Shimane", "Okayama", "Hiroshima", "Yamaguchi",
  "Tokushima", "Kagawa", "Ehime", "Kochi", "Fukuoka", "Saga", "Nagasaki",
  "Kumamoto", "Oita", "Miyazaki", "Kagoshima", "Okinawa",
];

/* -------------------- Component -------------------- */
export default function Donate() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addressRef = useRef(null);

  const [loadingZipcode, setLoadingZipcode] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [redirectPending, setRedirectPending] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "good",
    type: "free",
    price: "",
    windowHours: 48,
    addressLine1: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    prefecture: "",
  });

  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const isPremium = form.type === "premium";

  /* -------------------- Prefill Saved Address -------------------- */
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists() && snap.data().defaultAddress) {
          const a = snap.data().defaultAddress;
          setForm((f) => ({
            ...f,
            addressLine1: a.addressLine1 || "",
            addressLine2: a.addressLine2 || "",
            city: a.city || "",
            postalCode: a.postalCode || "",
            prefecture: a.prefecture || "",
          }));
          setAddressOpen(true);
        }
      } catch (e) {
        console.warn("Could not fetch saved address:", e);
      }
    })();
  }, [currentUser]);

  /* -------------------- Zipcode Autofill -------------------- */
  const fetchAddressFromZipcode = async (zip) => {
    const clean = zip.replace(/-/g, "");
    if (clean.length !== 7) return;
    setLoadingZipcode(true);
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${clean}`);
      const data = await res.json();
      if (data.status === 200 && data.results?.length) {
        const r = data.results[0];
        setForm((p) => ({
          ...p,
          prefecture: r.address1,
          city: `${r.address2}${r.address3}`,
        }));
        toast.success("Address auto-filled from zipcode!");
      } else toast.error("Zipcode not found");
    } catch {
      toast.error("Failed to fetch address");
    } finally {
      setLoadingZipcode(false);
    }
  };

  /* -------------------- Input Handlers -------------------- */
  const sanitizeText = (v = "") =>
    v
      .replace(/[^a-zA-Z0-9\s.,!()&'":;/-]/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const onChange = (e) => {
    const { name, value, type } = e.target;
    if (type === "select-one" || type === "radio") {
      setForm((f) => ({ ...f, [name]: value }));
      return;
    }
    let newVal = value;
    if (name === "price") newVal = value.replace(/[^\d]/g, "");
    else if (name === "postalCode") {
      newVal = value.replace(/[^\d]/g, "").replace(/(\d{3})(\d{4})/, "$1-$2").slice(0, 8);
      if (newVal.length === 8) fetchAddressFromZipcode(newVal);
    } else newVal = sanitizeText(value);
    setForm((f) => ({ ...f, [name]: newVal }));
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024);
    setImages([...images, ...valid].slice(0, 4));
  };

  const uploadAll = async (id) => {
    const urls = [];
    for (const f of images) {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `donations/${id}/${Date.now()}-${uuidv4()}.${ext}`;
      const rf = ref(storage, path);
      await uploadBytes(rf, f, { contentType: f.type });
      urls.push(await getDownloadURL(rf));
    }
    return urls;
  };

  /* -------------------- Validation -------------------- */
  const canSubmit = useMemo(() => {
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.category ||
      !form.addressLine1.trim() ||
      !form.city.trim() ||
      !form.postalCode.trim() ||
      !form.prefecture.trim()
    )
      return false;
    if (images.length < 2 || images.length > 4) return false;
    if (isPremium) {
      const n = Number(form.price);
      if (!Number.isFinite(n) || n < 100) return false;
    }
    return true;
  }, [form, images, isPremium]);

  /* -------------------- Submit -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !currentUser) return;
    if (!canSubmit) return setErrorMsg("Please complete all required fields.");

    setSubmitting(true);
    try {
      const id = uuidv4();
      const urls = await uploadAll(id);
      const donation = {
        donorId: currentUser.uid,
        donorEmail: currentUser.email,
        donorType: "user",
        verified: false,
        approved: false,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        pickupAddress: {
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          prefecture: form.prefecture.trim(),
          country: "Japan",
          fullAddress: `${form.addressLine1}${form.addressLine2 ? ", " + form.addressLine2 : ""}, ${form.city}, ${form.prefecture} ${form.postalCode}, Japan`,
        },
        type: form.type,
        price: isPremium ? Number(form.price) : null,
        currency: "JPY",
        status: "active",
        images: urls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(form.type === "free"
          ? { requestWindowEnd: Timestamp.fromDate(new Date(Date.now() + Number(form.windowHours) * 60 * 60 * 1000)) }
          : {}),
      };

      await addDoc(collection(db, "donations"), donation);

      toast.success("🎉 Donation submitted successfully!");
      setSuccessMsg("✅ Donation submitted! Redirecting to My Activity…");
      setRedirectPending(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Donation failed");
      toast.error("❌ Failed to submit donation.");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------- Safe Redirect -------------------- */
  useEffect(() => {
    if (!redirectPending) return;
    const timer = setTimeout(() => {
      try {
        navigate("/myactivity", { replace: true });
      } catch {
        window.location.href = "/myactivity";
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [redirectPending, navigate]);

  /* -------------------- Auto-scroll for Address -------------------- */
  useEffect(() => {
    if (addressOpen && addressRef.current && window.innerWidth < 640)
      addressRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [addressOpen]);

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
          {t("donate") || "Donate an Item"}
        </h1>

        {errorMsg && <div className="bg-red-50 border border-red-300 text-red-800 rounded-xl p-4 mb-6">{errorMsg}</div>}
        {successMsg && <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl p-4 mb-6">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 text-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  required
                  maxLength={100}
                  placeholder="e.g., Wooden Table or Baby Stroller"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Description *</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  required
                  maxLength={1000}
                  rows={5}
                  placeholder="Describe condition, size, and any defects..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Images (2–4) *</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFiles}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <div className="flex flex-wrap gap-3 mt-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(img)}
                        alt=""
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
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

              {/* Address Section */}
              <div className="border-t pt-3" ref={addressRef}>
                <button
                  type="button"
                  onClick={() => setAddressOpen((v) => !v)}
                  className="w-full flex justify-between items-center font-medium text-lg text-gray-800"
                >
                  <span>📍 Pickup Address *</span>
                  <ChevronDown
                    size={18}
                    className={`transform transition-transform duration-300 ${addressOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    addressOpen ? "max-h-[900px] mt-3 opacity-100" : "max-h-0 opacity-0"
                  } md:max-h-none md:opacity-100 md:mt-3`}
                >
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">
                      Postal Code *{" "}
                      {loadingZipcode && <span className="ml-2 text-xs text-indigo-600">Loading...</span>}
                    </label>
                    <input
                      name="postalCode"
                      value={form.postalCode}
                      onChange={onChange}
                      required
                      placeholder="e.g., 150-0001"
                      maxLength={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Prefecture *</label>
                    <select
                      name="prefecture"
                      value={form.prefecture}
                      onChange={onChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Select Prefecture</option>
                      {PREFECTURES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    name="city"
                    value={form.city}
                    onChange={onChange}
                    placeholder="City (e.g., Shibuya-ku)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                    required
                  />
                  <input
                    name="addressLine1"
                    value={form.addressLine1}
                    onChange={onChange}
                    placeholder="Street address (e.g., 1-2-3 Shibuya)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                    required
                  />
                  <input
                    name="addressLine2"
                    value={form.addressLine2}
                    onChange={onChange}
                    placeholder="Building/Apartment (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
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
                      className="accent-indigo-600 w-3 h-3"
                    />
                    Free (donation)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="premium"
                      checked={form.type === "premium"}
                      onChange={onChange}
                      className="accent-indigo-600 w-3 h-3"
                    />
                    Premium (for sale)
                  </label>
                </div>
              </div>

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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6 text-right">
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200"
            >
              {submitting ? "Uploading..." : "Donate Now"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
