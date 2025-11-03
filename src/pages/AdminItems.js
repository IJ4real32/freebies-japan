// ✅ FILE: src/pages/AdminItems.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      const snapshot = await getDocs(collection(db, 'donations'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setLoading(false);
    };
    fetchItems();
  }, []);

  const toggleVisibility = async (id, current) => {
    await updateDoc(doc(db, 'donations', id), { visible: !current });
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, visible: !current } : item
      )
    );
  };

  const deleteItem = async (id) => {
    await deleteDoc(doc(db, 'donations', id));
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const filteredItems = items.filter(item => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'visible' && item.visible) ||
      (filter === 'hidden' && !item.visible);

    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const exportToCSV = () => {
    const header = ['Title', 'Category', 'Condition', 'Visible'];
    const rows = filteredItems.map(item => [
      item.title,
      item.category,
      item.condition,
      item.visible ? 'Yes' : 'No'
    ]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'donations.csv');
    link.click();
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <p className="p-4">Loading items...</p>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Item Management</h1>
        <button
          onClick={() => navigate('/admin/item/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Sponsor Item
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm">Filter:</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="all">All</option>
            <option value="visible">Visible Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border px-3 py-1 rounded"
          />
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-2">
        Showing {paginatedItems.length} of {filteredItems.length} items
      </p>

      <table className="w-full border border-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Title</th>
            <th className="p-2">Category</th>
            <th className="p-2">Condition</th>
            <th className="p-2">Visible</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map(item => (
            <tr key={item.id} className="border-t">
              <td className="p-2 flex gap-2 items-center">
                {item.images && item.images.length > 0 && (
                  <img src={item.images[0]} alt={item.title} className="w-10 h-10 object-cover rounded" />
                )}
                {item.title}
              </td>
              <td className="p-2 text-center">{item.category}</td>
              <td className="p-2 text-center">{item.condition}</td>
              <td className="p-2 text-center">{item.visible ? 'Yes' : 'No'}</td>
              <td className="p-2 flex gap-2 justify-center">
                <button
                  onClick={() => navigate(`/admin/item/${item.id}`)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleVisibility(item.id, item.visible)}
                  className="text-yellow-600 hover:underline"
                >
                  {item.visible ? 'Hide' : 'Unhide'}
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, idx) => (
            <button
              key={idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
              className={`px-3 py-1 border rounded ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'bg-white text-black'}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
