import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        if (!currentUser) {
          setError("Please login to view requests");
          setLoading(false);
          return;
        }

        setLoading(true);
        const q = query(
          collection(db, 'requests'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const requestsWithItems = await Promise.all(
          querySnapshot.docs.map(async docSnap => {
            const request = docSnap.data();
            const itemDoc = await getDoc(doc(db, 'items', request.itemId));
            return {
              id: docSnap.id,
              ...request,
              itemTitle: itemDoc.exists() ? itemDoc.data().title : 'Unknown Item',
              itemImage: itemDoc.exists() ? itemDoc.data().imageUrl : null,
              createdAt: request.createdAt?.toDate?.() || new Date()
            };
          })
        );
        
        setRequests(requestsWithItems.sort((a, b) => b.createdAt - a.createdAt));
      } catch (err) {
        console.error("Error fetching requests:", err);
        setError("Failed to load requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [currentUser]);

  if (loading) return <div className="p-4 text-center">Loading requests...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Requests</h2>
      {requests.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p>You haven't made any requests yet</p>
          <Link to="/items" className="text-blue-600 hover:underline mt-2 inline-block">
            Browse available items
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div key={request.id} className={`border rounded-lg p-4 ${
              request.status === 'approved' ? 'bg-green-50 border-green-200' :
              request.status === 'rejected' ? 'bg-red-50 border-red-200' :
              'bg-white border-gray-200'
            }`}>
              <div className="flex flex-col md:flex-row gap-4">
                {request.itemImage && (
                  <div className="flex-shrink-0">
                    <img 
                      src={request.itemImage} 
                      alt={request.itemTitle}
                      className="w-24 h-24 object-cover rounded"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold">{request.itemTitle}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-gray-600">Status: <span className={`font-medium ${
                        request.status === 'approved' ? 'text-green-600' :
                        request.status === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {request.status}
                      </span></p>
                      <p className="text-gray-600">Requested: {request.createdAt.toLocaleDateString()}</p>
                    </div>
                    <div>
                      {request.adminNotes && (
                        <p className="text-gray-600">Admin Note: {request.adminNotes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}