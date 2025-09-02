import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase'; // Changed from '../../firebase'
import { useAuth } from '../contexts/AuthContext'; // Changed from '../../contexts/AuthContext'
import { addDoc } from 'firebase/firestore';

const Items = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const { currentUser } = useAuth();
  const [userRequests, setUserRequests] = useState([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        // Updated query with ordering and correct collection name
        const q = query(
          collection(db, 'donations'), // Changed from 'Donations' to 'donations'
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const itemsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setItems(itemsData);
      } catch (error) {
        console.error("Error fetching items: ", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserRequests = async () => {
      if (currentUser) {
        try {
          const q = query(
            collection(db, 'Requests'),
            where('userId', '==', currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          const requests = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUserRequests(requests);
        } catch (error) {
          console.error("Error fetching user requests: ", error);
        }
      }
    };

    fetchItems();
    fetchUserRequests();
  }, [currentUser]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const handleRequest = async (itemId) => {
    if (!currentUser) {
      alert('Please login to request items');
      return;
    }

    try {
      await addDoc(collection(db, 'Requests'), {
        itemId,
        userId: currentUser.uid,
        status: 'pending',
        requestedAt: new Date()
      });
      
      setUserRequests([...userRequests, {
        itemId,
        status: 'pending'
      }]);
      
      alert('Request submitted successfully!');
    } catch (error) {
      console.error("Error submitting request: ", error);
      alert('Failed to submit request');
    }
  };

  const getRequestStatus = (itemId) => {
    const request = userRequests.find(req => req.itemId === itemId);
    return request ? request.status : null;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Available Donations</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentItems.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Display first image if available */}
            <div className="h-48 overflow-hidden">
              <img 
                src={item.images?.[0] || 'https://via.placeholder.com/300'} 
                alt={item.title} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{item.title || 'No Title'}</h2>
              <p className="text-gray-600 mb-2">{item.description}</p>
              <div className="flex justify-between items-center mt-4">
                <div>
                  <span className="text-sm text-gray-500 block">{item.category}</span>
                  <span className="text-sm font-medium">
                    {item.condition} • {item.delivery}
                  </span>
                </div>
                {getRequestStatus(item.id) ? (
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    getRequestStatus(item.id) === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getRequestStatus(item.id)}
                  </span>
                ) : (
                  <button
                    onClick={() => handleRequest(item.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                  >
                    Request
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`mx-1 px-4 py-2 rounded ${
                currentPage === i + 1
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Items;