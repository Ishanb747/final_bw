import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ReportPage from './pages/ReportPage';
import HomePage from './pages/HomePage';
import Header from './components/Header';
import Footer from './components/Footer';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-blue-50/20 dark:from-slate-950 dark:via-purple-950/20 dark:to-blue-950/20 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
          <Header />
          <main className="flex-1 animate-fade-in">
            <Routes>
              <Route path="/report/:id" element={<ReportPage />} />
              <Route path="/" element={<HomePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}
export default App;
