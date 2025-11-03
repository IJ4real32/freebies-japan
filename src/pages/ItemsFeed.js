// ✅ FILE: src/pages/ItemsFeed.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import SubscriptionBanner from "../components/UI/SubscriptionBanner";
import { throttle } from "lodash";

const PAGE_SIZE = 12;

export default function ItemsFeed() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");

  /* --- Fetch initial batch --- */
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    const q = query(
      collection(db, "donations"),
      where("status", "in", ["active", "open"]),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setItems(docs);
    setLastVisible(snap.docs[snap.docs.length - 1]);
    setLoading(false);
  }, []);

  /* --- Load more (infinite scroll) --- */
  const loadMore = useCallback(async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    const q = query(
      collection(db, "donations"),
      where("status", "in", ["active", "open"]),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const newItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems((p) => [...p, ...newItems]);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    }
    setLoadingMore(false);
  }, [lastVisible, loadingMore]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  /* Infinite scroll listener */
  useEffect(() => {
    const handleScroll = throttle(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 400) loadMore();
    }, 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  /* --- Filtered items --- */
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SubscriptionBanner />

      {/* 🔍 Fixed search bar */}
      <div className="sticky top-16 z-40 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm py-3 px-4 flex justify-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search items or categories…"
          className="w-full max-w-xl px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
        />
      </div>

      {/* Feed Grid */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white h-64 rounded shadow-sm" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-gray-600 py-20">No items available.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const isPremium =
                item.type === "premium" || item.accessType === "premium";
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="relative bg-white rounded-lg shadow hover:shadow-xl transition cursor-pointer group"
                >
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button className="bg-white text-gray-900 px-3 py-1 rounded text-sm font-medium shadow">
                      View Item
                    </button>
                  </div>

                  <div className="h-52 overflow-hidden rounded-t-lg bg-gray-100">
                    {item.images?.[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h2 className="text-sm font-semibold line-clamp-2 h-10">
                      {item.title}
                    </h2>
                    <p className="text-xs text-gray-500 mb-1">
                      {item.category || ""}
                    </p>
                    <div className="flex items-center justify-between">
                      {isPremium ? (
                        <span className="text-indigo-600 font-bold text-sm">
                          ¥{item.price || item.priceJPY || "—"}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-sm">
                          FREE
                        </span>
                      )}
                      {item.verified && (
                        <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loadingMore && (
          <div className="text-center text-gray-500 mt-6 animate-pulse">
            ⏳ Loading more items…
          </div>
        )}
      </main>
    </div>
  );
}
