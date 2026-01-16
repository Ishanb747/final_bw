import { Github, Twitter, Mail, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">About TruthLens</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Multi-perspective fact-checking powered by GDELT global news database and AI analysis.
              See every side of the story.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Home</a></li>
              <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">How It Works</a></li>
              <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">Connect</h3>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors">
                <Github className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </a>
              <a href="#" className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors">
                <Twitter className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </a>
              <a href="#" className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors">
                <Mail className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-current" /> for truth seekers
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            © 2026 TruthLens. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
