import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AuditLog,
  Category,
  CategoryRegulation,
  Court,
  Match,
  Player,
  RegistrationStatus,
  SetScore,
  Team,
  Tournament,
  TournamentGroup,
  User,
  UserRole,
} from '../types';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_COURTS,
  INITIAL_GROUPS,
  INITIAL_MATCHES,
  INITIAL_TEAMS,
  INITIAL_TOURNAMENT,
  INITIAL_USERS,
} from '../data/initialData';
import { generateRoundRobinPairings } from '../utils/scoring';

interface TournamentContextType {
  tournament: Tournament;
  categories: Category[];
  courts: Court[];
  teams: Team[];
  groups: TournamentGroup[];
  matches: Match[];
  auditLogs: AuditLog[];
  users: User[];
  currentUser: User;
  
  // Navigation & Role State
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  
  // Data Reset & Initialization
  resetToDemoData: () => void;
  clearAllTournamentData: () => void;
  
  // Tournament & Categories
  updateTournament: (data: Partial<Tournament>) => void;
  addCategory: (cat: Category) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  updateRegulation: (categoryId: string, regulation: Partial<CategoryRegulation>) => void;
  
  // Courts
  addCourt: (court: Court) => void;
  updateCourt: (id: string, data: Partial<Court>) => void;
  deleteCourt: (id: string) => void;
  
  // Teams & Players
  registerTeam: (teamData: Omit<Team, 'id' | 'createdAt'>) => string;
  updateTeam: (teamId: string, data: Partial<Team>) => void;
  setTeamStatus: (teamId: string, status: RegistrationStatus, reason?: string) => void;
  addPlayer: (teamId: string, playerData: Omit<Player, 'id' | 'teamId'>) => void;
  updatePlayer: (playerId: string, data: Partial<Player>) => void;
  deletePlayer: (playerId: string) => void;
  verifyPlayer: (playerId: string, isVerified: boolean, notes?: string) => void;
  updateTeamCheckIn: (
    teamId: string,
    status: 'BELUM_HADIR' | 'HADIR' | 'TIDAK_HADIR',
    details?: {
      representativeName?: string;
      notes?: string;
      checkedPlayerIds?: string[];
    }
  ) => void;
  togglePlayerAttendance: (playerId: string, isPresent: boolean) => void;
  
  // Group Drawing Engine
  executeRandomDraw: (categoryId: string) => void;
  setManualSlot: (categoryId: string, teamId: string, slotCode: string) => void;
  lockDraw: (categoryId: string, lockedBy: string) => void;
  unlockDraw: (categoryId: string, unlockedBy: string, reason: string) => void;
  
  // Scheduling & Matches
  autoGenerateGroupSchedule: (categoryId: string) => void;
  addMatch: (match: Match) => void;
  updateMatch: (matchId: string, data: Partial<Match>) => void;
  assignReferee: (matchId: string, refereeId: string, refereeName: string) => void;
  
  // Scoring & Referee Actions
  updateLiveSetScore: (
    matchId: string,
    setNumber: number,
    homeScore: number,
    awayScore: number,
    isFinished: boolean,
    winnerSide?: 'HOME' | 'AWAY'
  ) => void;
  toggleServiceSide: (matchId: string) => void;
  submitMatchResult: (matchId: string, refereeNotes?: string) => void;
  verifyMatchResult: (matchId: string, approved: boolean, notes?: string) => void;
  adminCorrectScore: (
    matchId: string,
    sets: SetScore[],
    winnerTeamId: string,
    reason: string
  ) => void;
  
  // User Accounts & Authentication
  login: (email: string, password?: string) => { success: boolean; message: string; user?: User };
  logout: () => void;
  registerAccount: (newUser: Omit<User, 'id' | 'isApproved'>) => { success: boolean; message: string; user?: User };
  resetPassword: (email: string, newPassword: string) => { success: boolean; message: string };
  checkAccountStatus: (email: string) => User | undefined;
  approveUser: (userId: string) => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'sepak_takraw_tournament_v1_';

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial from local storage or fallback to demo data
  const [tournament, setTournamentState] = useState<Tournament>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'tournament');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.location?.includes('Tri Lomba Juang')) {
          parsed.location = 'GOR Sepak Takraw, Lodaya Bandung';
        }
        return parsed;
      } catch {
        return INITIAL_TOURNAMENT;
      }
    }
    return INITIAL_TOURNAMENT;
  });

  const [categories, setCategoriesState] = useState<Category[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [courts, setCourtsState] = useState<Court[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'courts');
    return saved ? JSON.parse(saved) : INITIAL_COURTS;
  });

  const [teams, setTeamsState] = useState<Team[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'teams');
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });

  const [groups, setGroupsState] = useState<TournamentGroup[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'groups');
    return saved ? JSON.parse(saved) : INITIAL_GROUPS;
  });

  const [matches, setMatchesState] = useState<Match[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'matches');
    return saved ? JSON.parse(saved) : INITIAL_MATCHES;
  });

  const [auditLogs, setAuditLogsState] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'audit');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [users, setUsersState] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'current_user');
    return saved ? JSON.parse(saved) : INITIAL_USERS[0]; // Default to Admin
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'tournament', JSON.stringify(tournament));
  }, [tournament]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'categories', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'courts', JSON.stringify(courts));
  }, [courts]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'teams', JSON.stringify(teams));
  }, [teams]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'groups', JSON.stringify(groups));
  }, [groups]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'matches', JSON.stringify(matches));
  }, [matches]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'audit', JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Helper: Append Audit Log
  const recordAudit = (action: Omit<AuditLog, 'id' | 'timestamp' | 'performedBy' | 'userRole'>) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      performedBy: currentUser.fullName,
      userRole: currentUser.role,
      ...action,
    };
    setAuditLogsState((prev) => [newLog, ...prev]);
  };

  // Role switching helper
  const switchRole = (role: UserRole) => {
    const found = users.find((u) => u.role === role);
    if (found) {
      setCurrentUserState(found);
    } else {
      // Create guest or dummy for role
      const tempUser: User = {
        id: 'usr-temp-' + role.toLowerCase(),
        email: `${role.toLowerCase()}@example.com`,
        fullName: role === 'UMUM' ? 'Pengunjung Umum' : `${role} Tamu`,
        role: role,
        isApproved: true,
      };
      setCurrentUserState(tempUser);
    }
  };

  const resetToDemoData = () => {
    setTournamentState(INITIAL_TOURNAMENT);
    setCategoriesState(INITIAL_CATEGORIES);
    setCourtsState(INITIAL_COURTS);
    setTeamsState(INITIAL_TEAMS);
    setGroupsState(INITIAL_GROUPS);
    setMatchesState(INITIAL_MATCHES);
    setAuditLogsState(INITIAL_AUDIT_LOGS);
    setUsersState(INITIAL_USERS);
    setCurrentUserState(INITIAL_USERS[0]);
    localStorage.clear();
  };

  const clearAllTournamentData = () => {
    const emptyTournament: Tournament = {
      id: 'trn-custom-' + Date.now(),
      slug: 'turnamen-baru',
      name: 'Turnamen Sepak Takraw Baru',
      organizer: 'Pengurus Cabang PSTI',
      location: 'GOR Sepak Takraw',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      description: 'Turnamen baru yang dibuat oleh panitia pelaksana.',
      bannerUrl: '/src/assets/images/hero_sepak_takraw_banner_1792478380267.jpg',
      isPublished: true,
      contactPerson: 'Sekretariat Panitia',
      contactPhone: '+62 812-0000-0000',
    };
    setTournamentState(emptyTournament);
    setCategoriesState([]);
    setCourtsState([
      { id: 'crt-1', tournamentId: emptyTournament.id, name: 'Lapangan 1 (Utama)', isActive: true },
      { id: 'crt-2', tournamentId: emptyTournament.id, name: 'Lapangan 2', isActive: true },
    ]);
    setTeamsState([]);
    setGroupsState([]);
    setMatchesState([]);
    recordAudit({
      actionType: 'REGULATION_UPDATED',
      entityName: 'Sistem Turnamen',
      entityId: emptyTournament.id,
      reason: 'Panitia menghapus semua data demo dan memulai turnamen kosong.',
    });
  };

  // Tournament & Categories
  const updateTournament = (data: Partial<Tournament>) => {
    setTournamentState((prev) => ({ ...prev, ...data }));
    recordAudit({
      actionType: 'REGULATION_UPDATED',
      entityName: 'Informasi Turnamen',
      entityId: tournament.id,
      reason: 'Pembaruan data profil turnamen.',
    });
  };

  const addCategory = (cat: Category) => {
    setCategoriesState((prev) => [...prev, cat]);
    recordAudit({
      actionType: 'REGULATION_UPDATED',
      entityName: `Kategori ${cat.name}`,
      entityId: cat.id,
      reason: 'Penambahan kategori pertandingan baru.',
    });
  };

  const updateCategory = (id: string, data: Partial<Category>) => {
    setCategoriesState((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const deleteCategory = (id: string) => {
    setCategoriesState((prev) => prev.filter((c) => c.id !== id));
    setTeamsState((prev) => prev.filter((t) => t.categoryId !== id));
    setGroupsState((prev) => prev.filter((g) => g.categoryId !== id));
    setMatchesState((prev) => prev.filter((m) => m.categoryId !== id));
  };

  const updateRegulation = (categoryId: string, regulation: Partial<CategoryRegulation>) => {
    setCategoriesState((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, regulation: { ...c.regulation, ...regulation } }
          : c
      )
    );
    recordAudit({
      actionType: 'REGULATION_UPDATED',
      entityName: `Regulasi Kategori`,
      entityId: categoryId,
      reason: 'Pembaruan pengaturan regulasi, jumlah set, poin, atau tie-breaker.',
    });
  };

  // Courts
  const addCourt = (court: Court) => {
    setCourtsState((prev) => [...prev, court]);
  };
  const updateCourt = (id: string, data: Partial<Court>) => {
    setCourtsState((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };
  const deleteCourt = (id: string) => {
    setCourtsState((prev) => prev.filter((c) => c.id !== id));
  };

  // Teams & Players
  const registerTeam = (teamData: Omit<Team, 'id' | 'createdAt'>): string => {
    const newId = 'team-' + Date.now();
    const newTeam: Team = {
      ...teamData,
      id: newId,
      createdAt: new Date().toISOString(),
      players: teamData.players || [],
    };
    setTeamsState((prev) => [...prev, newTeam]);
    recordAudit({
      actionType: 'TEAM_STATUS_CHANGED',
      entityName: `Pendaftaran Tim: ${newTeam.name}`,
      entityId: newId,
      reason: 'Pendaftaran tim baru diajukan oleh pelatih/manajer.',
      newValue: newTeam.registrationStatus,
    });
    return newId;
  };

  const updateTeam = (teamId: string, data: Partial<Team>) => {
    setTeamsState((prev) => prev.map((t) => (t.id === teamId ? { ...t, ...data } : t)));
  };

  const setTeamStatus = (teamId: string, status: RegistrationStatus, reason?: string) => {
    const target = teams.find((t) => t.id === teamId);
    if (!target) return;
    setTeamsState((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? { ...t, registrationStatus: status, rejectionReason: reason || t.rejectionReason }
          : t
      )
    );
    recordAudit({
      actionType: 'TEAM_STATUS_CHANGED',
      entityName: `Tim: ${target.name}`,
      entityId: teamId,
      reason: reason || `Status pendaftaran diubah menjadi ${status}`,
      oldValue: target.registrationStatus,
      newValue: status,
    });
  };

  const addPlayer = (teamId: string, playerData: Omit<Player, 'id' | 'teamId'>) => {
    const newPlayer: Player = {
      ...playerData,
      id: 'ply-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      teamId,
    };
    setTeamsState((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, players: [...t.players, newPlayer] } : t
      )
    );
  };

  const updatePlayer = (playerId: string, data: Partial<Player>) => {
    setTeamsState((prev) =>
      prev.map((t) => ({
        ...t,
        players: t.players.map((p) => (p.id === playerId ? { ...p, ...data } : p)),
      }))
    );
  };

  const deletePlayer = (playerId: string) => {
    setTeamsState((prev) =>
      prev.map((t) => ({
        ...t,
        players: t.players.filter((p) => p.id !== playerId),
      }))
    );
  };

  const verifyPlayer = (playerId: string, isVerified: boolean, notes?: string) => {
    setTeamsState((prev) =>
      prev.map((t) => ({
        ...t,
        players: t.players.map((p) =>
          p.id === playerId ? { ...p, isVerified, verificationNotes: notes } : p
        ),
      }))
    );
  };

  const updateTeamCheckIn = (
    teamId: string,
    status: 'BELUM_HADIR' | 'HADIR' | 'TIDAK_HADIR',
    details?: {
      representativeName?: string;
      notes?: string;
      checkedPlayerIds?: string[];
    }
  ) => {
    const target = teams.find((t) => t.id === teamId);
    if (!target) return;

    setTeamsState((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;

        const updatedPlayers = t.players.map((p) => {
          if (details?.checkedPlayerIds) {
            return {
              ...p,
              isPresent: details.checkedPlayerIds.includes(p.id),
              jerseyChecked: details.checkedPlayerIds.includes(p.id),
            };
          } else if (status === 'HADIR') {
            return { ...p, isPresent: true, jerseyChecked: true };
          } else if (status === 'BELUM_HADIR') {
            return { ...p, isPresent: false };
          }
          return p;
        });

        return {
          ...t,
          checkInStatus: status,
          checkInTime: status === 'HADIR' ? new Date().toISOString() : undefined,
          checkInBy: status === 'HADIR' ? currentUser.fullName : undefined,
          checkInRepresentative: details?.representativeName || t.checkInRepresentative || t.coachName || t.managerName,
          checkInNotes: details?.notes !== undefined ? details.notes : t.checkInNotes,
          players: updatedPlayers,
        };
      })
    );

    recordAudit({
      actionType: 'TEAM_STATUS_CHANGED',
      entityName: `Daftar Ulang: ${target.name}`,
      entityId: teamId,
      reason: `Status kehadiran diubah menjadi ${status}. Petugas: ${currentUser.fullName}${
        details?.representativeName ? `, Perwakilan: ${details.representativeName}` : ''
      }`,
      oldValue: target.checkInStatus || 'BELUM_HADIR',
      newValue: status,
    });
  };

  const togglePlayerAttendance = (playerId: string, isPresent: boolean) => {
    setTeamsState((prev) =>
      prev.map((t) => ({
        ...t,
        players: t.players.map((p) =>
          p.id === playerId ? { ...p, isPresent, jerseyChecked: isPresent } : p
        ),
      }))
    );
  };

  // Group Drawing Engine
  const executeRandomDraw = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    if (cat.isDrawLocked) {
      alert('Pengundian grup kategori ini sudah dikunci! Buka kunci terlebih dahulu jika ingin mengundi ulang.');
      return;
    }

    // Only APPROVED teams
    const eligibleTeams = teams.filter(
      (t) => t.categoryId === categoryId && t.registrationStatus === 'APPROVED'
    );

    if (eligibleTeams.length === 0) {
      alert('Tidak ada tim dengan status APPROVED pada kategori ini untuk diundi.');
      return;
    }

    // Shuffle teams using Fisher-Yates
    const shuffled = [...eligibleTeams].sort(() => Math.random() - 0.5);
    const groupCount = cat.groupCount || 4;
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, groupCount);

    const newGroups: TournamentGroup[] = groupLetters.map((letter) => ({
      id: `grp-${categoryId}-${letter.toLowerCase()}`,
      categoryId,
      name: letter,
      teamIds: [],
    }));

    // Distribute into groups round-robin and assign slot codes (A1, B1, C1, etc.)
    const updatedTeams = [...teams];

    shuffled.forEach((team, index) => {
      const groupIdx = index % groupCount;
      const groupLetter = groupLetters[groupIdx];
      const slotNumber = Math.floor(index / groupCount) + 1;
      const slotCode = `${groupLetter}${slotNumber}`;

      newGroups[groupIdx].teamIds.push(team.id);

      const tIdx = updatedTeams.findIndex((t) => t.id === team.id);
      if (tIdx !== -1) {
        updatedTeams[tIdx] = {
          ...updatedTeams[tIdx],
          groupSlotCode: slotCode,
        };
      }
    });

    setTeamsState(updatedTeams);
    setGroupsState((prev) => [
      ...prev.filter((g) => g.categoryId !== categoryId),
      ...newGroups,
    ]);

    recordAudit({
      actionType: 'DRAW_CONDUCTED',
      entityName: `Pengundian Grup: ${cat.name}`,
      entityId: categoryId,
      reason: `Pengundian acak otomatis transparan untuk ${eligibleTeams.length} tim ke dalam ${groupCount} grup.`,
      newValue: newGroups.map((g) => `Grup ${g.name}: ${g.teamIds.length} tim`).join(' | '),
    });
  };

  const setManualSlot = (categoryId: string, teamId: string, slotCode: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat?.isDrawLocked) {
      alert('Pengundian sedang dikunci!');
      return;
    }
    const cleanSlot = slotCode.trim().toUpperCase();
    const groupLetter = cleanSlot[0];

    setTeamsState((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, groupSlotCode: cleanSlot } : t))
    );

    // Update group teamIds
    setGroupsState((prev) => {
      const existing = prev.filter((g) => g.categoryId === categoryId);
      let targetGroup = existing.find((g) => g.name === groupLetter);
      if (!targetGroup) {
        targetGroup = {
          id: `grp-${categoryId}-${groupLetter.toLowerCase()}`,
          categoryId,
          name: groupLetter,
          teamIds: [],
        };
        existing.push(targetGroup);
      }
      return [
        ...prev.filter((g) => g.categoryId !== categoryId),
        ...existing.map((g) => {
          const filtered = g.teamIds.filter((id) => id !== teamId);
          if (g.name === groupLetter) {
            filtered.push(teamId);
          }
          return { ...g, teamIds: filtered };
        }),
      ];
    });
  };

  const lockDraw = (categoryId: string, lockedBy: string) => {
    setCategoriesState((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              isDrawLocked: true,
              drawLockedAt: new Date().toISOString(),
              drawLockedBy: lockedBy,
            }
          : c
      )
    );
    recordAudit({
      actionType: 'DRAW_CONDUCTED',
      entityName: `Kunci Pengundian Kategori`,
      entityId: categoryId,
      reason: 'Bagan dan pembagian pool grup resmi dikunci dan dipublikasikan.',
    });
  };

  const unlockDraw = (categoryId: string, unlockedBy: string, reason: string) => {
    setCategoriesState((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              isDrawLocked: false,
              drawLockedAt: undefined,
              drawLockedBy: undefined,
            }
          : c
      )
    );
    recordAudit({
      actionType: 'DRAW_UNLOCKED',
      entityName: `Buka Kunci Pengundian`,
      entityId: categoryId,
      reason: `Pengundian dibuka kunci oleh ${unlockedBy}: ${reason}`,
    });
  };

  // Scheduling
  const autoGenerateGroupSchedule = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const catGroups = groups.filter((g) => g.categoryId === categoryId);
    if (catGroups.length === 0) {
      alert('Belum ada grup yang dibentuk untuk kategori ini.');
      return;
    }

    const newMatches: Match[] = [];
    let matchCounter = 1;
    const activeCourts = courts.filter((c) => c.isActive);
    const courtList = activeCourts.length > 0 ? activeCourts : courts;
    let courtIdx = 0;

    catGroups.forEach((group) => {
      const pairs = generateRoundRobinPairings(group.teamIds);
      pairs.forEach(([teamA, teamB], pIdx) => {
        const assignedCourt = courtList[courtIdx % courtList.length];
        courtIdx++;

        // Calculate time slot: start 08:30 + 1 hour per match per court
        const baseHour = 8 + Math.floor(matchCounter / 3);
        const baseMinute = (matchCounter % 2) * 30;
        const timeStr = `${String(baseHour).padStart(2, '0')}:${String(baseMinute).padStart(2, '0')}`;

        newMatches.push({
          id: `mtc-${categoryId}-${group.name.toLowerCase()}-${matchCounter}`,
          matchCode: `M-${cat.name.slice(0, 3).toUpperCase()}-${group.name}${matchCounter}`,
          tournamentId: tournament.id,
          categoryId,
          stage: 'GROUP_STAGE',
          groupId: group.id,
          groupName: group.name,
          courtId: assignedCourt?.id,
          teamHomeId: teamA,
          teamAwayId: teamB,
          scheduledDate: tournament.startDate,
          scheduledTime: timeStr,
          status: 'SCHEDULED',
          sets: [],
          homeSetsWon: 0,
          awaySetsWon: 0,
          isVerified: false,
        });
        matchCounter++;
      });
    });

    setMatchesState((prev) => [
      ...prev.filter((m) => m.categoryId !== categoryId || m.stage !== 'GROUP_STAGE'),
      ...newMatches,
    ]);

    recordAudit({
      actionType: 'SCHEDULE_CHANGED',
      entityName: `Jadwal Babak Grup: ${cat.name}`,
      entityId: categoryId,
      reason: `Pembuatan jadwal round-robin otomatis untuk ${newMatches.length} pertandingan.`,
    });
  };

  const addMatch = (match: Match) => {
    setMatchesState((prev) => [...prev, match]);
  };

  const updateMatch = (matchId: string, data: Partial<Match>) => {
    setMatchesState((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...data } : m)));
  };

  const assignReferee = (matchId: string, refereeId: string, refereeName: string) => {
    setMatchesState((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, refereeId, refereeName } : m))
    );
    recordAudit({
      actionType: 'SCHEDULE_CHANGED',
      entityName: `Pertandingan: ${matchId}`,
      entityId: matchId,
      reason: `Penugasan wasit: ${refereeName}`,
    });
  };

  // Scoring & Referee
  const updateLiveSetScore = (
    matchId: string,
    setNumber: number,
    homeScore: number,
    awayScore: number,
    isFinished: boolean,
    winnerSide?: 'HOME' | 'AWAY'
  ) => {
    setMatchesState((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;

        const currentSets = [...(m.sets || [])];
        const existingIdx = currentSets.findIndex((s) => s.setNumber === setNumber);
        const setObj: SetScore = {
          setNumber,
          homeScore,
          awayScore,
          isFinished,
          winnerSide,
        };

        if (existingIdx !== -1) {
          currentSets[existingIdx] = setObj;
        } else {
          currentSets.push(setObj);
        }

        // Tally sets won
        const homeWon = currentSets.filter((s) => s.isFinished && s.winnerSide === 'HOME').length;
        const awayWon = currentSets.filter((s) => s.isFinished && s.winnerSide === 'AWAY').length;

        return {
          ...m,
          status: 'ON_GOING',
          sets: currentSets,
          homeSetsWon: homeWon,
          awaySetsWon: awayWon,
        };
      })
    );
  };

  const toggleServiceSide = (matchId: string) => {
    setMatchesState((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, serviceSide: m.serviceSide === 'HOME' ? 'AWAY' : 'HOME' }
          : m
      )
    );
  };

  const submitMatchResult = (matchId: string, refereeNotes?: string) => {
    setMatchesState((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        // Winner is determined by sets won
        const winner =
          m.homeSetsWon > m.awaySetsWon
            ? m.teamHomeId
            : m.awaySetsWon > m.homeSetsWon
            ? m.teamAwayId
            : undefined;

        return {
          ...m,
          status: 'AWAITING_VERIFICATION',
          winnerTeamId: winner,
          refereeNotes: refereeNotes || m.refereeNotes,
        };
      })
    );
    recordAudit({
      actionType: 'SCORE_SUBMITTED',
      entityName: `Pertandingan: ${matchId}`,
      entityId: matchId,
      reason: 'Wasit mengirimkan draf hasil pertandingan untuk disahkan panitia.',
    });
  };

  // Helper for Auto-Advancing Bracket Winners
  const advanceBracket = (
    currentMatches: Match[],
    verifiedMatch: Match,
    winnerId: string,
    loserId?: string
  ): Match[] => {
    let updated = [...currentMatches];

    // Pemenang maju ke nextMatchId (Final atau Semifinal)
    if (verifiedMatch.nextMatchId) {
      updated = updated.map((m) => {
        if (m.id !== verifiedMatch.nextMatchId) return m;
        if (verifiedMatch.nextMatchSide === 'HOME' || !m.teamHomeId) {
          return { ...m, teamHomeId: winnerId };
        } else {
          return { ...m, teamAwayId: winnerId };
        }
      });
    }

    // Yang kalah masuk ke loserMatchId (Perebutan Juara 3 jika berlaku)
    if (verifiedMatch.loserMatchId && loserId) {
      updated = updated.map((m) => {
        if (m.id !== verifiedMatch.loserMatchId) return m;
        if (verifiedMatch.loserMatchSide === 'HOME' || !m.teamHomeId) {
          return { ...m, teamHomeId: loserId };
        } else {
          return { ...m, teamAwayId: loserId };
        }
      });
    }

    return updated;
  };

  const verifyMatchResult = (matchId: string, approved: boolean, notes?: string) => {
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return;

    if (!approved) {
      // Reject result, return to ON_GOING
      setMatchesState((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                status: 'ON_GOING',
                verificationNotes: notes || 'Hasil ditolak oleh admin. Periksa kembali skor.',
              }
            : m
        )
      );
      recordAudit({
        actionType: 'SCORE_VERIFIED',
        entityName: `Pertandingan: ${matchId}`,
        entityId: matchId,
        reason: `Admin MENOLAK hasil: ${notes || 'Data belum valid'}`,
      });
      return;
    }

    // Approved!
    const winnerId =
      targetMatch.homeSetsWon > targetMatch.awaySetsWon
        ? targetMatch.teamHomeId
        : targetMatch.teamAwayId;
    const loserId =
      targetMatch.homeSetsWon > targetMatch.awaySetsWon
        ? targetMatch.teamAwayId
        : targetMatch.teamHomeId;

    let updatedMatches = matches.map((m) => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        status: 'COMPLETED' as const,
        isVerified: true,
        verifiedBy: currentUser.fullName,
        verifiedAt: new Date().toISOString(),
        verificationNotes: notes || 'Disahkan oleh pengurus cabang.',
        winnerTeamId: winnerId,
      };
    });

    // Advance in bracket if applicable
    if (winnerId) {
      updatedMatches = advanceBracket(updatedMatches, targetMatch, winnerId, loserId);
    }

    setMatchesState(updatedMatches);

    recordAudit({
      actionType: 'SCORE_VERIFIED',
      entityName: `Pertandingan: ${targetMatch.matchCode}`,
      entityId: matchId,
      reason: `Hasil resmi DISAHKAN. Pemenang: ${
        teams.find((t) => t.id === winnerId)?.name || winnerId
      }.`,
    });
  };

  const adminCorrectScore = (
    matchId: string,
    sets: SetScore[],
    winnerTeamId: string,
    reason: string
  ) => {
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return;

    const oldSetsSummary = targetMatch.sets
      .map((s) => `Set ${s.setNumber}: ${s.homeScore}-${s.awayScore}`)
      .join(', ');
    const newSetsSummary = sets
      .map((s) => `Set ${s.setNumber}: ${s.homeScore}-${s.awayScore}`)
      .join(', ');

    const homeWon = sets.filter((s) => s.isFinished && s.winnerSide === 'HOME').length;
    const awayWon = sets.filter((s) => s.isFinished && s.winnerSide === 'AWAY').length;

    let updatedMatches = matches.map((m) => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        sets,
        homeSetsWon: homeWon,
        awaySetsWon: awayWon,
        winnerTeamId,
        verificationNotes: `Dikoreksi resmi oleh ${currentUser.fullName}: ${reason}`,
      };
    });

    // Re-advance bracket
    const loserId =
      winnerTeamId === targetMatch.teamHomeId
        ? targetMatch.teamAwayId
        : targetMatch.teamHomeId;
    updatedMatches = advanceBracket(updatedMatches, targetMatch, winnerTeamId, loserId);

    setMatchesState(updatedMatches);

    recordAudit({
      actionType: 'SCORE_CORRECTION',
      entityName: `Koreksi Skor Laga: ${targetMatch.matchCode}`,
      entityId: matchId,
      reason,
      oldValue: oldSetsSummary,
      newValue: newSetsSummary,
    });
  };

  // Accounts & Authentication
  const login = (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, message: 'Email tidak ditemukan di sistem!' };
    }

    if (password && user.password && user.password !== password) {
      return { success: false, message: 'Kata sandi tidak sesuai. Silakan periksa kembali!' };
    }

    if (!user.isApproved && (user.role === 'WASIT' || user.role === 'PELATIH')) {
      return {
        success: false,
        message: 'Akun Anda sedang dalam proses verifikasi persetujuan oleh Admin Turnamen PSTI.',
      };
    }

    setCurrentUserState(user);
    recordAudit({
      actionType: 'TEAM_STATUS_CHANGED',
      entityName: `Sesi Masuk: ${user.fullName}`,
      entityId: user.id,
      reason: `Pengguna berhasil login sebagai ${user.role}`,
    });

    return { success: true, message: `Selamat datang kembali, ${user.fullName}!`, user };
  };

  const logout = () => {
    const guestUser: User = {
      id: 'usr-guest-' + Date.now(),
      email: 'umum@psti.id',
      fullName: 'Pengunjung Umum',
      role: 'UMUM',
      isApproved: true,
    };
    setCurrentUserState(guestUser);
  };

  const registerAccount = (newUser: Omit<User, 'id' | 'isApproved'>) => {
    const cleanEmail = newUser.email.trim().toLowerCase();
    const exists = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { success: false, message: 'Email sudah terdaftar di sistem!' };
    }

    const id = 'usr-' + Date.now();
    // Admin & Umum auto approved; Wasit & Pelatih require admin approval
    const isApproved = newUser.role === 'ADMIN' || newUser.role === 'UMUM';
    const userObj: User = {
      ...newUser,
      id,
      isApproved,
      registeredAt: new Date().toISOString(),
    };

    setUsersState((prev) => [...prev, userObj]);
    if (isApproved) {
      setCurrentUserState(userObj);
    }

    recordAudit({
      actionType: 'TEAM_STATUS_CHANGED',
      entityName: `Registrasi Akun: ${userObj.fullName}`,
      entityId: id,
      reason: `Pendaftaran akun baru dengan peran ${userObj.role} (${isApproved ? 'Aktif' : 'Menunggu Approval'}).`,
    });

    return {
      success: true,
      message: isApproved
        ? 'Pendaftaran akun berhasil! Anda langsung masuk ke sistem.'
        : 'Pendaftaran berhasil diajukan! Akun Pelatih/Wasit akan aktif setelah disetujui Admin Turnamen.',
      user: userObj,
    };
  };

  const resetPassword = (email: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, message: 'Email akun tidak ditemukan!' };
    }

    setUsersState((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, password: newPassword } : u))
    );

    recordAudit({
      actionType: 'TEAM_STATUS_CHANGED',
      entityName: `Reset Kata Sandi: ${user.fullName}`,
      entityId: user.id,
      reason: 'Pengguna melakukan pembaruan kata sandi.',
    });

    return { success: true, message: 'Kata sandi berhasil diperbarui! Silakan masuk kembali.' };
  };

  const checkAccountStatus = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    return users.find((u) => u.email.toLowerCase() === cleanEmail);
  };

  const approveUser = (userId: string) => {
    setUsersState((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isApproved: true } : u))
    );
    recordAudit({
      actionType: 'TEAM_STATUS_CHANGED',
      entityName: 'Persetujuan Akun Pengguna',
      entityId: userId,
      reason: 'Admin menyetujui akun petugas/pelatih.',
    });
  };

  return (
    <TournamentContext.Provider
      value={{
        tournament,
        categories,
        courts,
        teams,
        groups,
        matches,
        auditLogs,
        users,
        currentUser,
        setCurrentUser: setCurrentUserState,
        switchRole,
        resetToDemoData,
        clearAllTournamentData,
        updateTournament,
        addCategory,
        updateCategory,
        deleteCategory,
        updateRegulation,
        addCourt,
        updateCourt,
        deleteCourt,
        registerTeam,
        updateTeam,
        setTeamStatus,
        addPlayer,
        updatePlayer,
        deletePlayer,
        verifyPlayer,
        updateTeamCheckIn,
        togglePlayerAttendance,
        executeRandomDraw,
        setManualSlot,
        lockDraw,
        unlockDraw,
        autoGenerateGroupSchedule,
        addMatch,
        updateMatch,
        assignReferee,
        updateLiveSetScore,
        toggleServiceSide,
        submitMatchResult,
        verifyMatchResult,
        adminCorrectScore,
        login,
        logout,
        registerAccount,
        resetPassword,
        checkAccountStatus,
        approveUser,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = (): TournamentContextType => {
  const ctx = useContext(TournamentContext);
  if (!ctx) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return ctx;
};
