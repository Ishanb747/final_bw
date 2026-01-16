import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import FactCheckReport from '../components/FactCheckReport';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        // If API Key is missing, we might want to mock data or show error
        if (!import.meta.env.VITE_FIREBASE_API_KEY) {
           setError('Firebase API Key missing. Please configure .env');
           setLoading(false);
           return;
        }

        const docRef = doc(db, 'reports', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          setError('Report not found');
        }
      } catch (err: any) {
        console.error(err);
        setError('Error loading report: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl font-semibold text-slate-500 animate-pulse">Loading analysis...</div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl font-semibold text-red-500">{error}</div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-6xl">
       <FactCheckReport data={data} />
    </div>
  );
}
