import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const DeliveryForm = ({ request, onSubmit, onCancel, existingData }) => {
  const { currentUser } = useAuth();
  
  const fallbackData = currentUser?.defaultAddress || {};
  const [formData, setFormData] = useState({
    zipCode: existingData.zipCode || fallbackData.zipCode || '',
    address: existingData.address || fallbackData.address || '',
    roomNumber: existingData.roomNumber || fallbackData.roomNumber || '',
    phone: existingData.phone || fallbackData.phone || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (formData.zipCode.length === 7 && /^\d+$/.test(formData.zipCode)) {
      const fetchAddress = async () => {
        try {
          setLoading(true);
          const response = await axios.get(
            `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${formData.zipCode}`
          );

          if (response.data.results) {
            setSuggestions(response.data.results);
            if (response.data.results.length === 1) {
              const result = response.data.results[0];
              setFormData(prev => ({
                ...prev,
                address: `${result.address1} ${result.address2} ${result.address3}`
              }));
            }
          }
        } catch (err) {
          setError('ZIP code lookup failed');
        } finally {
          setLoading(false);
        }
      };

      const timer = setTimeout(fetchAddress, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.zipCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.zipCode || !formData.address || !formData.phone) {
      setError('ZIP Code, Address, and Phone are required');
      return;
    }

    if (formData.zipCode.length !== 7) {
      setError('ZIP code must be 7 digits');
      return;
    }

    if (!/^\d{10,15}$/.test(formData.phone)) {
      setError('Enter a valid phone number');
      return;
    }

    onSubmit(request.id, formData);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-medium mb-3">Delivery Information</h3>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-2 mb-3 rounded">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">ZIP Code *</label>
          <input
            type="text"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            maxLength="7"
            pattern="\d{7}"
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="1234567"
          />
          {loading && <p className="text-xs text-gray-500">Looking up address...</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="08012345678"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium mb-1">Address *</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {suggestions.length > 1 && (
          <div className="mt-1 text-xs">
            <p>Select an address:</p>
            <ul className="border rounded mt-1 divide-y">
              {suggestions.map((item, i) => (
                <li
                  key={i}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      address: `${item.address1} ${item.address2} ${item.address3}`
                    }))
                  }
                >
                  {item.address1} {item.address2} {item.address3}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium mb-1">Room/Building</label>
        <input
          type="text"
          name="roomNumber"
          value={formData.roomNumber}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end space-x-3 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
        >
          Save Address
        </button>
      </div>
    </form>
  );
};

export default DeliveryForm;
