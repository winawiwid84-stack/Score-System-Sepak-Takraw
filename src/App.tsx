/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { PublicPortal } from './components/public/PublicPortal';
import { StandingsTable } from './components/standings/StandingsTable';
import { TournamentBracket } from './components/bracket/TournamentBracket';
import { PodiumView } from './components/podium/PodiumView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RefereeDashboard } from './components/referee/RefereeDashboard';
import { CoachDashboard } from './components/coach/CoachDashboard';
import { AthleteDashboard } from './components/athlete/AthleteDashboard';
import { AdminGuideModal } from './components/docs/AdminGuideModal';
import { AuthModal } from './components/auth/AuthModal';
import { AuthPage } from './components/auth/AuthPage';

const MainContent: React.FC = () => {
  const { currentUser } = useTournament();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenAuth={() => setCurrentTab('auth')}
      />

      {/* Main Body View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentTab === 'home' && <PublicPortal onNavigateTab={setCurrentTab} />}
        {currentTab === 'jadwal' && <PublicPortal onNavigateTab={setCurrentTab} />}
        {currentTab === 'klasemen' && <StandingsTable />}
        {currentTab === 'bagan' && <TournamentBracket />}
        {currentTab === 'podium' && <PodiumView />}
        {currentTab === 'admin' && <AdminDashboard />}
        {currentTab === 'wasit' && <RefereeDashboard />}
        {currentTab === 'pelatih' && <CoachDashboard />}
        {currentTab === 'atlet' && <AthleteDashboard />}
        {currentTab === 'auth' && <AuthPage onNavigateTab={setCurrentTab} />}
      </main>

      {/* Footer */}
      <Footer />

      {/* Admin Step-by-Step Guide Modal */}
      <AdminGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          setIsGuideOpen(false);
        }}
      />

      {/* Auth / Account Profile Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <TournamentProvider>
      <MainContent />
    </TournamentProvider>
  );
}
