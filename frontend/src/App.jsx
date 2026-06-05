import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import InverseDesign from './pages/InverseDesign';
import Library from './pages/Library';
import MaterialsSearch from './pages/MaterialsSearch';
import Results from './pages/Results';
import Settings from './pages/Settings';

/**
 * Render the MolForge single-page application.
 * @returns {JSX.Element} Application root.
 */
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_minmax(0,1fr)]">
          <Sidebar />
          <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/results" element={<Results />} />
              <Route path="/library" element={<Library />} />
              <Route path="/materials" element={<MaterialsSearch />} />
              <Route path="/inverse-design" element={<InverseDesign />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
