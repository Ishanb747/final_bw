import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface PerspectiveTabsProps {
  activeTab: 'left' | 'center' | 'right' | 'bias';
  onTabChange: (tab: 'left' | 'center' | 'right' | 'bias') => void;
  counts: {
    left: number;
    center: number;
    right: number;
  };
}

export default function PerspectiveTabs({ activeTab, onTabChange, counts }: PerspectiveTabsProps) {
  const tabs = [
    { id: 'left' as const, label: 'Left', icon: TrendingDown, color: 'blue', count: counts.left },
    { id: 'center' as const, label: 'Center', icon: Minus, color: 'purple', count: counts.center },
    { id: 'right' as const, label: 'Right', icon: TrendingUp, color: 'red', count: counts.right },
    { id: 'bias' as const, label: 'Bias Comparison', icon: BarChart3, color: 'slate' },
  ];

  return (
    <div className="flex items-center gap-3 mb-8 flex-wrap animate-slide-up">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2
              ${isActive 
                ? `bg-white dark:bg-slate-800 shadow-lg ring-2 ring-${tab.color}-500 dark:ring-${tab.color}-400 text-${tab.color}-700 dark:text-${tab.color}-300 scale-105` 
                : `bg-slate-100 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-${tab.color}-600 dark:hover:text-${tab.color}-400 hover:shadow-md`
              }
            `}
          >
            {/* Animated gradient background on hover */}
            <div className={`
              absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity
              bg-gradient-to-br from-${tab.color}-400 to-${tab.color}-600
            `}></div>
            
            {/* Icon */}
            <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'animate-pulse-subtle' : ''}`} />
            
            {/* Label */}
            <span className="relative z-10">{tab.label}</span>
            
            {/* Count badge */}
            {tab.count !== undefined && (
              <span className={`
                relative z-10 px-2 py-0.5 rounded-full text-xs font-bold
                ${isActive 
                  ? `bg-${tab.color}-100 dark:bg-${tab.color}-900/40 text-${tab.color}-700 dark:text-${tab.color}-300` 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
