import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import AuthModal from './components/Auth/AuthModal';
import PageTracker from './components/PageTracker';
import Dashboard from './pages/Dashboard';

const ProteinFolding = lazy(() => import('./pages/ProteinFolding'));
const Admin = lazy(() => import('./pages/Admin'));
const CloudStatus = lazy(() => import('./pages/CloudStatus'));
const Editor = lazy(() => import('./pages/Editor'));
const Explore = lazy(() => import('./pages/Explore'));
const InverseDesign = lazy(() => import('./pages/InverseDesign'));
const Library = lazy(() => import('./pages/Library'));
const MaterialsSearch = lazy(() => import('./pages/MaterialsSearch'));
const Results = lazy(() => import('./pages/Results'));
const SharedMolecule = lazy(() => import('./pages/SharedMolecule'));
const Settings = lazy(() => import('./pages/Settings'));
const Workspace = lazy(() => import('./pages/Workspace'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Profile = lazy(() => import('./pages/Auth/Profile'));
const Signup = lazy(() => import('./pages/Auth/Signup'));

/**
 * Render the MolForge single-page application.
 * @returns {JSX.Element} Application root.
 */
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-transparent">
        <PageTracker />
        <Navbar />
        <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
          <Sidebar />
          <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
            <Suspense fallback={<div className="py-12 text-center text-sm text-slate-400">Loading workspace...</div>}><Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/results" element={<Results />} />
              <Route path="/library" element={<Library />} />
              <Route path="/materials" element={<MaterialsSearch />} />
              <Route
                path="/protein"
                element={<ProteinFolding />}
              />
              <Route path="/inverse-design" element={<InverseDesign />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/m/:token" element={<SharedMolecule />} />
              <Route path="/workspaces" element={<Workspace />} />
              <Route path="/cloud" element={<CloudStatus />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/profile" element={<Profile />} />
            </Routes></Suspense>
          </main>
        </div>
        <AuthModal />
      </div>
    </BrowserRouter>
  );
}
