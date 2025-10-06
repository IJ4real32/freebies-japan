import React, { useState } from "react";
import useAdmin from "../hooks/useAdmin";
import selectionApi from "../services/selectionApi";

export default function SelectionAdmin() {
  const isAdmin = useAdmin();
  const [form, setForm] = useState({ title:"", maxWinners:1, opensAt:"", closesAt:"", description:"" });
  const [selectionId, setSelectionId] = useState("");

  if (!isAdmin) return <div className="p-4">Admins only</div>;

  const create = async () => {
    const payload = {
      title: form.title,
      description: form.description || undefined,
      maxWinners: Number(form.maxWinners || 1),
      opensAt: form.opensAt || undefined,
      closesAt: form.closesAt || undefined,
    };
    const res = await selectionApi.create(payload);
    const id = res?.data?.lotteryId;
    setSelectionId(id);
    alert("Selection created: " + id);
  };

  const open = async ()  => { await selectionApi.open({ lotteryId: selectionId }); alert("Selection opened"); };
  const close = async () => { await selectionApi.close({ lotteryId: selectionId }); alert("Selection closed"); };
  const draw = async ()  => {
    const res = await selectionApi.draw({ lotteryId: selectionId });
    alert("Selected users: " + ((res?.data?.winners || []).join(", ") || "none"));
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Selections Admin</h1>

      <div className="space-y-2">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Title"
          value={form.title}
          onChange={e=>setForm(f=>({ ...f, title:e.target.value }))}
        />
        <textarea
          className="w-full border rounded px-3 py-2"
          placeholder="Short description (optional)"
          value={form.description}
          onChange={e=>setForm(f=>({ ...f, description:e.target.value }))}
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="number" min={1}
          placeholder="Max selected"
          value={form.maxWinners}
          onChange={e=>setForm(f=>({ ...f, maxWinners:e.target.value }))}
        />
        <label className="block text-sm opacity-70">Opens at (optional)</label>
        <input
          className="w-full border rounded px-3 py-2"
          type="datetime-local"
          value={form.opensAt}
          onChange={e=>setForm(f=>({ ...f, opensAt:e.target.value }))}
        />
        <label className="block text-sm opacity-70">Closes at (optional)</label>
        <input
          className="w-full border rounded px-3 py-2"
          type="datetime-local"
          value={form.closesAt}
          onChange={e=>setForm(f=>({ ...f, closesAt:e.target.value }))}
        />
        <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={create}>
          Create selection
        </button>
      </div>

      <hr className="my-4" />

      <div className="space-y-2">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Selection ID"
          value={selectionId}
          onChange={e=>setSelectionId(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 rounded bg-gray-800 text-white" onClick={open}>Open</button>
          <button className="px-4 py-2 rounded bg-gray-600 text-white" onClick={close}>Close</button>
          <button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={draw}>Pick users</button>
        </div>
      </div>
    </div>
  );
}
