import { useState } from 'react';
import { Share2, Bookmark, Image as ImageIcon } from 'lucide-react';
import PerspectiveTabs from './PerspectiveTabs';

interface Article {
  title: string;
  url: string;
  domain: string;
  sourcecountry: string;
  tone: number;
  image?: string | null;
}

interface FactCheckData {
  report: string;
  articles: Article[];
  perspectives: {
    left: number;
    right: number;
    center: number;
    international: number;
  };
  input_bias: string;
  timestamp: any;
}

export default function FactCheckReport({ data }: { data: FactCheckData }) {
  const [activeTab, setActiveTab] = useState<'left' | 'center' | 'right' | 'bias'>('center');
  const [showAllArticles, setShowAllArticles] = useState(false);

  if (!data) return null;

  // Parsing Logic
  const parseSection = (regex: RegExp) => {
    const match = data.report.match(regex);
    return match ? match[1].trim() : "";
  };

  const coreFact = parseSection(/\*\*Core Fact\*\*:\s*(.*?)(?=\*\*Input Bias|\*\*Perspectives\*\*|$)/s) || "Analysis available.";
  const inputBiasText = parseSection(/\*\*Input Bias Analysis\*\*:\s*(.*?)(?=\*\*Perspectives\*\*|$)/s);
  const perspectivesText = parseSection(/\*\*Perspectives\*\*:\s*(.*?)(?=\*\*Article Count|$)/s);
  const biasAnalysis = parseSection(/\*\*Media Bias Analysis\*\*:(.*?)(?=\*\*Conclusion\*\*|$)/s);
  
  const totalSources = (data.perspectives.left || 0) + (data.perspectives.right || 0) + (data.perspectives.center || 0) + (data.perspectives.international || 0);

  // Parse perspectives into separate sections
  const parsePerspectives = () => {
    const leftMatch = perspectivesText.match(/\*\s*\*\*Left-Leaning View\*\*:\s*(.*?)(?=\*\s*\*\*Right-Leaning|$)/s);
    const rightMatch = perspectivesText.match(/\*\s*\*\*Right-Leaning View\*\*:\s*(.*?)(?=\*\s*\*\*Center|$)/s);
    const centerMatch = perspectivesText.match(/\*\s*\*\*Center\/Mainstream View\*\*:\s*(.*?)(?=\*\s*\*\*International|$)/s);
    const intlMatch = perspectivesText.match(/\*\s*\*\*International View\*\*:\s*(.*?)$/s);

    return {
      left: leftMatch ? leftMatch[1].trim() : '',
      right: rightMatch ? rightMatch[1].trim() : '',
      center: centerMatch ? centerMatch[1].trim() : '',
      international: intlMatch ? intlMatch[1].trim() : ''
    };
  };

  const perspectives = parsePerspectives();

  // Left: negative tone, Right: positive tone, Center: neutral
  const leftArticles = data.articles.slice(0, Math.ceil(data.articles.length / 3));
  const centerArticles = data.articles.slice(Math.ceil(data.articles.length / 3), Math.ceil(data.articles.length * 2 / 3));
  const rightArticles = data.articles.slice(Math.ceil(data.articles.length * 2 / 3));

  // Helper for formatting text
 const formatText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium decoration-blue-200 underline-offset-2">{linkMatch[1]}</a>;
      }
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
           return <b key={`${i}-${j}`} className="font-bold text-slate-800 dark:text-slate-200">{bp.slice(2, -2)}</b>;
        }
        return <span key={`${i}-${j}`}>{bp}</span>;
      });
    });
  };

  // Get content and articles for active tab
  const getTabContent = () => {
    switch (activeTab) {
      case 'left':
        return { content: perspectives.left, articles: leftArticles, label: 'Left-Leaning' };
      case 'right':
        return { content: perspectives.right, articles: rightArticles, label: 'Right-Leaning' };
      case 'center':
        return { content: perspectives.center, articles: centerArticles, label: 'Center/Mainstream' };
      default:
        return null;
    }
  };

  const tabContent = getTabContent();

  return (
    <div className="flex flex-col gap-8 font-sans text-slate-900 dark:text-slate-100 animate-fade-in">
      
      {/* Header Section */}
      <div className="space-y-4 stagger-1 animate-slide-up">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              <span>Published {new Date().toLocaleDateString()}</span>
              <span>•</span>
              <span>Analysis</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
              {formatText(coreFact)}
          </h1>

          <div className="flex items-center gap-4 pt-2 flex-wrap">
               <div className="flex-1"></div>
               <div className="flex gap-2 text-slate-400 dark:text-slate-500">
                  <Share2 size={18} className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
                  <Bookmark size={18} className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
               </div>
          </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-700" />

      {/* Input Bias (if any) */}
      {inputBiasText && (
          <div className="bg-slate-50 dark:bg-slate-800/50 border-l-4 border-slate-400 dark:border-slate-600 p-4 rounded-r-lg stagger-2 animate-slide-up">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Input Text Analysis</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 italic m-0">{inputBiasText}</p>
          </div>
      )}

      {/* Perspective Tabs */}
      <PerspectiveTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={data.perspectives}
      />

      {/* Tab Content */}
      {activeTab !== 'bias' && tabContent && (
        <div className="space-y-6 animate-fade-in">
          {/* Perspective Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none stagger-3 animate-slide-up">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">{tabContent.label} Perspective</h3>
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {formatText(tabContent.content)}
              </div>
            </div>
          </div>

          {/* Images from articles in this perspective */}
          {tabContent.articles.some(art => art.image) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 stagger-4 animate-slide-up">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Related Images
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {tabContent.articles
                  .filter(art => art.image)
                  .slice(0, 6)
                  .map((art, idx) => (
                    <a 
                      key={idx}
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-video rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all"
                    >
                      <img 
                        src={art.image!} 
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-white text-xs font-medium line-clamp-2">{art.title}</span>
                      </div>
                    </a>
                  ))}
              </div>
            </div>
          )}

          {/* Articles for this perspective */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4">{tabContent.articles.length} Articles</h3>
            <div className="space-y-3">
              {(showAllArticles ? tabContent.articles : tabContent.articles.slice(0, 5)).map((art, i) => (
                <div key={i} className="group bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-4 transition-all">
                  <div className="flex gap-3">
                    {art.image && (
                      <img 
                        src={art.image} 
                        alt=""
                        className="w-20 h-20 rounded object-cover flex-shrink-0"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                          {art.domain}
                        </span>
                        {art.tone < -2 && <span className="text-[10px] text-red-500 font-medium border border-red-100 dark:border-red-900 px-1.5 rounded">Critical</span>}
                        {art.tone > 2 && <span className="text-[10px] text-green-500 font-medium border border-green-100 dark:border-green-900 px-1.5 rounded">Supportive</span>}
                      </div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                        <a href={art.url} target="_blank" rel="noopener noreferrer">{art.title}</a>
                      </h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {tabContent.articles.length > 5 && (
              <button 
                onClick={() => setShowAllArticles(!showAllArticles)}
                className="w-full py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg mt-4 transition-colors border border-dashed border-slate-300 dark:border-slate-600"
              >
                {showAllArticles ? "Show Less" : `Load ${tabContent.articles.length - 5} more articles`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bias Comparison Tab */}
      {activeTab === 'bias' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-bold mb-6">Media Bias Comparison</h3>
            
            {/* Coverage Distribution */}
            <div className="mb-8">
              <h4 className="font-semibold mb-3">Coverage Distribution</h4>
              <div className="h-12 w-full flex rounded-lg overflow-hidden shadow-md">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold" style={{ width: `${(data.perspectives.left/totalSources)*100}%` }}>
                  {Math.round((data.perspectives.left/totalSources)*100)}%
                </div>
                <div className="h-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center text-white font-bold" style={{ width: `${(data.perspectives.center/totalSources)*100}%` }}>
                  {Math.round((data.perspectives.center/totalSources)*100)}%
                </div>
                <div className="h-full bg-gradient-to-l from-red-400 to-red-600 flex items-center justify-center text-white font-bold" style={{ width: `${(data.perspectives.right/totalSources)*100}%` }}>
                  {Math.round((data.perspectives.right/totalSources)*100)}%
                </div>
              </div>
              <div className="flex justify-between text-sm font-medium mt-2">
                <span className="text-blue-600 dark:text-blue-400">← Left ({data.perspectives.left})</span>
                <span className="text-slate-500 dark:text-slate-400">Center ({data.perspectives.center})</span>
                <span className="text-red-500 dark:text-red-400">Right ({data.perspectives.right}) →</span>
              </div>
            </div>

            {/* Bias Analysis */}
            {biasAnalysis && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5">
                <h4 className="font-semibold mb-3">Media Analysis</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {formatText(biasAnalysis)}
                </p>
              </div>
            )}

            {/* All Perspectives Summary */}
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-bold text-blue-700 dark:text-blue-300 mb-2">Left-Leaning View</h5>
                <p className="text-sm text-slate-700 dark:text-slate-300">{perspectives.left.substring(0, 150)}...</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h5 className="font-bold text-purple-700 dark:text-purple-300 mb-2">Center View</h5>
                <p className="text-sm text-slate-700 dark:text-slate-300">{perspectives.center.substring(0, 150)}...</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h5 className="font-bold text-red-700 dark:text-red-300 mb-2">Right-Leaning View</h5>
                <p className="text-sm text-slate-700 dark:text-slate-300">{perspectives.right.substring(0, 150)}...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
