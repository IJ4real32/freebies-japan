import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import BackToDashboardButton from "../components/Admin/BackToDashboardButton";
import toast from "react-hot-toast";
import {
  RefreshCcw,
  Plus,
  Mail,
  MapPin,
  User,
  JapaneseYen,
  Truck,
  CheckCircle,
  XCircle,
  PackageCheck,
  CalendarClock,
} from "lucide-react";
import { sendAdminItemStatusEmail } from "../services/functionsApi";

export default function AdminItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [relisting, setRelisting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState({});
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    method: "pickup",
    date: "",
    time: "",
    note: "",
  });

  // 🧩 Fetch item and related requests
  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, "donations", id));
        if (!snap.exists()) {
          toast.error("Item not found");
          navigate("/admin/items");
          return;
        }
        setItem({ id: snap.id, ...snap.data() });

        const q = query(collection(db, "requests"), where("itemId", "==", id));
        const reqSnap = await getDocs(q);
        const reqs = reqSnap.docs.map((r) => ({ id: r.id, ...r.data() }));
        setRequests(reqs);
      } catch (err) {
        console.error("Error loading item:", err);
        toast.error("Failed to load item details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  // ✅ Handle relist
  const handleRelist = async () => {
    if (!window.confirm(`Reopen request period for "${item.title}"?`)) return;
    setRelisting(true);
    try {
      const callable = httpsCallable(functions, "adminRelistDonation");
      await callable({ donationId: item.id, durationHours: 48 });
      toast.success("✅ Item relisted successfully!");
    } catch (err) {
      console.error("Relist failed:", err);
      toast.error("❌ Failed to relist item");
    } finally {
      setRelisting(false);
    }
  };

  // ✅ Create sponsored item
  const handleCreateSponsored = async () => {
    setCreating(true);
    try {
      toast.loading("Opening donation form...");
      navigate("/donate");
    } catch (err) {
      toast.error("Failed to open form");
      console.error(err);
    } finally {
      setCreating(false);
      toast.dismiss();
    }
  };

  // ✅ Update request status manually (with optional scheduler)
  const handleUpdateStatus = async (req, newStatus) => {
    if (newStatus === "approved") {
      setActiveRequest(req);
      setShowScheduler(true);
      return;
    }

    await updateRequest(req, newStatus);
  };

  const updateRequest = async (req, newStatus, deliverySchedule = null) => {
    setUpdating((p) => ({ ...p, [req.id]: true }));
    try {
      await updateDoc(doc(db, "requests", req.id), {
        status: newStatus,
        lastStatusUpdate: new Date(),
      });

      if (deliverySchedule) {
        await addDoc(collection(db, "pickups"), {
          requestId: req.id,
          itemId: req.itemId,
          userId: req.userId,
          method: deliverySchedule.method,
          scheduledDate: deliverySchedule.dateTime,
          adminNote: deliverySchedule.note || "",
          createdAt: serverTimestamp(),
          status: "scheduled",
        });
      }

      await sendAdminItemStatusEmail({
        requestId: req.id,
        status: newStatus,
        userEmail: req.userEmail,
        itemTitle: req.itemTitle || item.title,
      });

      toast.success(`Status updated to ${newStatus}`);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, status: newStatus } : r
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setUpdating((p) => ({ ...p, [req.id]: false }));
    }
  };

  // ✅ Submit scheduled delivery
  const confirmSchedule = async () => {
    if (!scheduleData.date || !scheduleData.time) {
      toast.error("Please select both date and time.");
      return;
    }

    const dateTime = new Date(`${scheduleData.date}T${scheduleData.time}:00`);
    const deliverySchedule = {
      ...scheduleData,
      dateTime,
    };

    await updateRequest(activeRequest, "approved", deliverySchedule);
    setShowScheduler(false);
    setActiveRequest(null);
    setScheduleData({ method: "pickup", date: "", time: "", note: "" });
  };

  if (loading)
    return (
      <div className="p-6 text-center text-gray-600">
        <p>Loading item details...</p>
      </div>
    );

  if (!item) return null;

  const isPremium =
    item.type === "premium" || item.accessType === "premium" || item.isPremium;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BackToDashboardButton />
      <h1 className="text-2xl font-bold mb-6">{item.title}</h1>

      {/* 🖼️ Images */}
      <div className="flex flex-wrap gap-3 mb-5">
        {item.images?.length ? (
          item.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Image ${idx + 1}`}
              className="w-40 h-40 object-cover rounded-lg border hover:scale-105 transition-transform"
            />
          ))
        ) : (
          <img
            src="/default-item.jpg"
            alt="Default"
            className="w-40 h-40 object-cover rounded-lg border"
          />
        )}
      </div>

      {/* 📋 Details */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
        <p className="text-gray-700">
          <strong>Description:</strong> {item.description || "No description"}
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <p>
            <strong>Status:</strong>{" "}
            <span className="capitalize">{item.status || "unknown"}</span>
          </p>
          <p>
            <strong>Listing Type:</strong>{" "}
            {isPremium ? (
              <span className="text-purple-700 font-semibold">Premium</span>
            ) : (
              "Free"
            )}
          </p>
          {isPremium && (
            <p className="flex items-center gap-1">
              <JapaneseYen size={14} /> {item.priceJPY || item.price || "N/A"}
            </p>
          )}
        </div>

        <hr className="my-3" />

        {/* 🧍 Donor */}
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <User size={16} /> Donor Information
          </h3>
          <p className="flex items-center gap-2 text-gray-700">
            <Mail size={14} /> {item.donorEmail || "Unknown"}
          </p>
          {item.delivery && (
            <p className="flex items-center gap-2 text-gray-700">
              <Truck size={14} />{" "}
              {item.delivery === "pickup"
                ? `Pickup at: ${item.pickupLocation || "N/A"}`
                : "Delivery"}
            </p>
          )}
        </div>

        <hr className="my-3" />

        {/* 🗂️ Requests */}
        <h3 className="font-semibold text-gray-800 mb-2">
          Requests ({requests.length})
        </h3>
        {requests.length ? (
          requests.map((r) => (
            <div
              key={r.id}
              className="border rounded-lg p-3 bg-gray-50 shadow-sm mb-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800">
                    👤 {r.userName || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500">{r.userEmail || "—"}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    r.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : r.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : r.status === "delivered"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              {/* Controls */}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  disabled={updating[r.id]}
                  onClick={() => handleUpdateStatus(r, "approved")}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-full"
                >
                  <CheckCircle size={12} /> Approve
                </button>
                <button
                  disabled={updating[r.id]}
                  onClick={() => handleUpdateStatus(r, "rejected")}
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-full"
                >
                  <XCircle size={12} /> Reject
                </button>
                <button
                  disabled={updating[r.id]}
                  onClick={() => handleUpdateStatus(r, "delivered")}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full"
                >
                  <PackageCheck size={12} /> Delivered
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 italic">No requests yet.</p>
        )}
      </div>

      {/* 🛠️ Buttons */}
      <div className="mt-6 flex flex-wrap gap-3 justify-end">
        <button
          disabled={relisting}
          onClick={handleRelist}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm ${
            relisting
              ? "bg-gray-300 text-gray-500"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          <RefreshCcw size={14} />
          Relist
        </button>

        <button
          disabled={creating}
          onClick={handleCreateSponsored}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm ${
            creating
              ? "bg-gray-300 text-gray-500"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          <Plus size={14} />
          Sponsored Item
        </button>
      </div>

      {/* 🚚 Delivery Scheduler Modal */}
      {showScheduler && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CalendarClock size={16} /> Schedule Pickup / Delivery
            </h3>

            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              value={scheduleData.method}
              onChange={(e) =>
                setScheduleData((p) => ({ ...p, method: e.target.value }))
              }
              className="w-full border rounded-md p-2 mb-3"
            >
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>

            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={scheduleData.date}
              onChange={(e) =>
                setScheduleData((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full border rounded-md p-2 mb-3"
            />

            <label className="block text-sm font-medium mb-1">Time</label>
            <input
              type="time"
              value={scheduleData.time}
              onChange={(e) =>
                setScheduleData((p) => ({ ...p, time: e.target.value }))
              }
              className="w-full border rounded-md p-2 mb-3"
            />

            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea
              rows={2}
              value={scheduleData.note}
              onChange={(e) =>
                setScheduleData((p) => ({ ...p, note: e.target.value }))
              }
              placeholder="Optional admin note..."
              className="w-full border rounded-md p-2 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowScheduler(false)}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmSchedule}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
