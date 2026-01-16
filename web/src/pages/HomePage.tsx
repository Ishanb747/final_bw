import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        const fetchedReports = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReports(fetchedReports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TruthLens Dashboard</h1>
                <p className="text-slate-500">Your recent fact checks and analysis.</p>
             </div>
             <div className="text-sm font-medium text-slate-400">
                v1.0.0
             </div>
        </header>

        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-48 bg-white rounded-xl shadow-sm animate-pulse"></div>
                ))}
             </div>
        ) : reports.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-slate-300">
                <h3 className="text-xl font-medium text-slate-400">No reports found</h3>
                <p className="text-slate-400 mt-2">Use the extension to create your first analysis.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(report => (
                    <ReportCard key={report.id} report={report} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: any }) {
    // Extract core fact summary (first sentence or so)
    const coreFactMatch = report.report?.match(/\*\*Core Fact\*\*:\s*(.*?)(?=\.|\n|$)/);
    const summary = coreFactMatch ? coreFactMatch[1] : report.query;
    
    // Status
    const isTrue = report.report?.toLowerCase().includes("**conclusion**: **true**") || report.report?.toLowerCase().includes("verified true");
    const isFalse = report.report?.toLowerCase().includes("**conclusion**: **false**");
    const isMisleading = report.report?.toLowerCase().includes("misleading");

    let statusColor = "bg-slate-100 text-slate-600";
    let statusText = "Unverified";
    if (isTrue) { statusColor = "bg-green-100 text-green-700"; statusText = "True"; }
    if (isFalse) { statusColor = "bg-red-100 text-red-700"; statusText = "False"; }
    if (isMisleading) { statusColor = "bg-orange-100 text-orange-700"; statusText = "Misleading"; }

    return (
        <Link to={`/report/${report.id}`} className="group block bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-brand-primary/30 transition-all overflow-hidden flex flex-col h-full">
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${statusColor}`}>
                        {statusText}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(report.timestamp?.seconds * 1000).toLocaleDateString()}
                    </span>
                </div>
                <h3 className="font-semibold text-slate-800 line-clamp-2 group-hover:text-brand-primary transition-colors mb-2">
                    {report.query}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                    {summary}...
                </p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs font-medium text-slate-500">
                    {report.article_count || 0} Sources
                </div>
                <div className="text-brand-primary text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Report <ChevronRight size={14} />
                </div>
            </div>
        </Link>
    )
}
