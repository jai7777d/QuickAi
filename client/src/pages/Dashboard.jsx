import React, { useState, useEffect } from 'react';
import { Gem, Sparkles } from 'lucide-react';
import { Protect, useAuth } from '@clerk/clerk-react';
import CreationItem from '../components/CreationItem';
import axios from 'axios';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Dashboard = () => {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const getDashboardData = async () => {
    try {
      const { data } = await axios.get('/api/user/get-user-creations', {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (data.success) {
        setCreations(data.creations);
      } else {
        toast.error(data.message || 'Failed to fetch creations');
      }
    } catch (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  return (
    <div className="h-full overflow-y-scroll p-6">
      {/* Stats Section */}
      <div className="flex justify-start gap-4 flex-wrap">
        {/* Total Creations */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200">
          <div>
            <p>Total Creations</p>
            <h2 className="text-xl font-semibold">{creations.length}</h2>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3588F2] to-[#0BB0D7] text-white flex justify-center items-center">
            <Sparkles className="w-5 text-white" />
          </div>
        </div>

        {/* Active Plan */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200">
          <div>
            <p>Active Plan</p>
            <h2 className="text-xl font-semibold">
              <Protect plan="premium" fallback="Free">
                Premium
              </Protect>
            </h2>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF61C5] to-[#9E53EE] text-white flex justify-center items-center">
            <Gem className="w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Recent Creations */}
      {loading ? (
        <div className="flex justify-center items-center h-3/4">
          <div className="animate-spin rounded-full h-11 w-11 border-3 border-purple-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-3 mt-6">
          <p className="font-medium">Recent Creations</p>
          {creations.length > 0 ? (
            creations.map((item) => <CreationItem key={item.id} item={item} />)
          ) : (
            <p className="text-gray-500">No creations yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
