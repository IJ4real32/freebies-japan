import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import selectionApi from "../services/selectionApi";
import SelectionJoinButton from "../components/SelectionJoinButton";
import { useAuth } from "../contexts/AuthContext";

export default function SelectionDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [pub, setPub] = useState(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const pubRes = await selectionApi.pub({ lotteryId: id });
        const pubData = pubRes?.data?.lottery ?? null;
        let meJoined = false;
        if (currentUser) {
          const meRes = await selectionApi.me({ lotteryId: id });
          meJoined = !!meRes?.data?.joined;
        }
        if (!ignore) {
          setPub(pubData);
          setJoined(meJoined);
        }
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load selection");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [id, currentUser]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;
  if (!pub) return <div className="p-4">Selection not found</div>;

  const opensAt = pub.opensAt ? new Date(pub.opensAt).toLocaleString() : null;
  const closesAt = pub.closesAt ? new Date(pub.closesAt).toLocaleString() : null;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">{pub.title}</h1>
      {pub.description && <p className="text-sm opacity-80">{pub.description}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div><span className="opacity-70">Selection status: </span><b>{pub.status}</b></div>
        <div><span className="opacity-70">Participants: </span>{pub.ticketCount ?? 0}</div>
        {opensAt && <div><span className="opacity-70">Opens: </span>{opensAt}</div>}
        {closesAt && <div><span className="opacity-70">Closes: </span>{closesAt}</div>}
      </div>

      {Array.isArray(pub.winners) && pub.winners.length > 0 && (
        <div className="text-sm">
          <span className="opacity-70">Selected users: </span>
          {pub.winners.join(", ")}
        </div>
      )}

      <SelectionJoinButton
        selectionId={id}
        selection={pub}
        joined={joined}
        onJoined={() => setJoined(true)}
      />
    </div>
  );
}
