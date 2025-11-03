// ✅ FILE: src/pages/ViewItem.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, httpsCallable, functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import SubscriptionBanner from "../components/UI/SubscriptionBanner";
import ItemDepositButton from "../components/Payments/ItemDepositButton";
import { ArrowLeft } from "lucide-react";

/* ------------------------------------------------------------------
 * Utility: Format countdown timer
 * ------------------------------------------------------------------ */
function formatTimeRemaining(endAt) {
  if (!endAt) return "";
  const end = endAt.toMillis ? endAt.toMillis() : new Date(endAt).getTime();
  const diff = Math.max(0, end - Date.now());
  if (diff <= 0) return "Expired";
  const hrs = Math.floor(diff / 1000 / 3600);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */
export default function ViewItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isSubscribed, trialCreditsLeft, isTrialExpired, decrementTrialCredit } =
    useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerText, setTimerText] = useState("");

  /* 🔹 Load item on mount */
  useEffect(() => {
    const loadItem = async () => {
      const snap = await getDoc(doc(db, "donations", id));
      if (snap.exists()) {
        const data = snap.data();
        setItem({ id: snap.id, ...data });
      } else {
        toast.error("Item not found");
        navigate("/items");
      }
      setLoading(false);
    };
    loadItem();
  }, [id, navigate]);

  /* ⏱️ Update timer every minute */
  useEffect(() => {
    if (!item?.requestWindowEnd) return;
    const update = () => setTimerText(formatTimeRemaining(item.requestWindowEnd));
    update();
    const intervalId = setInterval(update, 60000);
    return () => clearInterval(intervalId);
  }, [item]);

  /* 🟢 Request handler */
  const handleRequest = useCallback(async () => {
    if (!currentUser) {
      toast.error("Please log in first");
      navigate("/login");
      return;
    }
    try {
      const callable = httpsCallable(functions, "onRequestCreateAddTicket");
      const res = await callable({ itemId: item.id });
      toast.success("✅ Request submitted successfully!");
      console.log("Request:", res.data);
    } catch (e) {
      toast.error("Failed to submit request");
      console.error(e);
    }
  }, [currentUser, item, navigate]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Loading item details…
      </div>
    );

  if (!item) return null;

  const isPremium = item.type === "premium" || item.accessType === "premium";
  const price = item.price || item.priceJPY || item.amountJPY;

  /* ------------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------------ */
  return (
    <div className="relative min-h-screen bg-gray-50">
      <SubscriptionBanner />

      {/* 🧭 Floating Back Button */}
      <button
        onClick={() => navigate("/items")}
        className="fixed bottom-6 left-6 z-50 bg-white/90 backdrop-blur-md shadow-lg border border-gray-200 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-gray-100 transition"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back to Feed</span>
      </button>

      <main className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8 bg-white rounded-lg shadow-sm mt-4">
        {/* ---------------------- IMAGE SECTION ---------------------- */}
        <div>
          <img
            src={item.images?.[0] || "/default-item.jpg"}
            alt={item.title}
            className="w-full h-[400px] object-contain rounded-lg bg-gray-100"
          />
          {item.images?.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {item.images.slice(1).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`thumbnail-${i}`}
                  className="w-20 h-20 object-cover border rounded cursor-pointer hover:scale-105 transition-transform"
                />
              ))}
            </div>
          )}
        </div>

        {/* ---------------------- INFO SECTION ---------------------- */}
        <div>
          <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
          <p className="text-sm text-gray-600 mb-4">{item.description}</p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {item.verified && (
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded">
                ✅ Verified
              </span>
            )}
            {item.donorType === "admin" && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                🌟 Sponsored
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                isPremium ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"
              }`}
            >
              {isPremium ? "Premium" : "Free"}
            </span>
            {item.availabilityCycle > 1 && (
              <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                🔁 Cycle {item.availabilityCycle}
              </span>
            )}
          </div>

          {/* ---------------------- PRICE / TIMER / ACTION ---------------------- */}
          {isPremium ? (
            <>
              <p className="text-3xl font-semibold text-indigo-600 mb-4">
                ¥{price?.toLocaleString() || "—"}
              </p>
              <ItemDepositButton itemId={item.id} title={item.title} amountJPY={price} />
            </>
          ) : (
            <>
              <div className="mb-3">
                <span className="text-gray-700 font-medium text-sm">
                  ⏱️ {timerText}
                </span>
              </div>
              <button
                onClick={handleRequest}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-medium"
              >
                {timerText === "Expired" ? "Request Closed" : "Request Item"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
