import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, setToken } from './api.js';
import { supabase } from './lib/supabaseClient.js';

import { AppContext } from './app-context.js';

function emptyData() {
  return {
    classes: [],
    assignments: [],
    announcements: [],
    materials: [],
    events: [],
    notifications: [],
    submissions: [],
    users: [],
    classStudents: {},
    settings: {},
    stats: {},
    attendanceSummary: [],
    attendanceRecent: [],
  };
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyBootstrap = useCallback((boot = {}) => {
    setData({
      classes: boot.classes || [],
      assignments: boot.assignments || [],
      announcements: boot.announcements || [],
      materials: boot.materials || [],
      events: boot.events || [],
      notifications: boot.notifications || [],
      submissions: boot.submissions || [],
      users: boot.users || [],
      classStudents: boot.classStudents || {},
      settings: boot.settings || {},
      stats: boot.stats || {},
      attendanceSummary: boot.attendanceSummary || [],
      attendanceRecent: boot.attendanceRecent || [],
    });
    return boot;
  }, []);

  const refresh = useCallback(async () => applyBootstrap(await api.bootstrap()), [applyBootstrap]);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      setLoading(true);
      try {
        const { user: profile } = await api.me();
        if (!mounted) return;
        setUser(profile);
        await refresh();
      } catch (e) {
        if (!mounted) return;
        if (!(e instanceof ApiError) || e.status !== 401) {
          setError(e.message || 'Your session expired. Please sign in again.');
        }
        setToken(null);
        setUser(null);
        setData(emptyData());
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setData(emptyData());
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (!user) return undefined;
    const channel = supabase
      .channel(`smartclass-live-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  const login = async (email, password) => {
    setError(null);
    const { token, user: profile } = await api.login(email, password);
    setToken(token);
    setUser(profile);
    await refresh();
    return profile;
  };

  const register = async (body) => {
    setError(null);
    const { token, user: profile } = await api.register(body);
    setToken(token);
    setUser(profile);
    await refresh();
    return profile;
  };

  const logout = async () => {
    await api.logout?.();
    setToken(null);
    setUser(null);
    setData(emptyData());
  };

  const run = async (fn) => {
    setError(null);
    try {
      const result = await fn();
      await refresh();
      return result;
    } catch (e) {
      if (e.status === 401) setUser(null);
      setError(e.message || 'Something went wrong.');
      throw e;
    }
  };

  const value = {
    user,
    setUser,
    ...data,
    loading,
    error,
    setError,
    refresh,
    login,
    register,
    logout,
    createClass: (body) => run(() => api.createClass(body)),
    joinClass: (code) => run(() => api.joinClass(code)),
    createAssignment: (body) => run(() => api.createAssignment(body)),
    submitAssignment: (assignmentId, file, fileName, textAnswer) =>
      run(() => api.submitAssignment(assignmentId, file, fileName, textAnswer)),
    gradeSubmission: (id, grade, feedback) => run(() => api.gradeSubmission(id, grade, feedback)),
    downloadSubmission: (id, fileName) => api.downloadSubmission(id, fileName),
    createAnnouncement: (body) => run(() => api.createAnnouncement(body)),
    uploadMaterial: (classId, title, type, file) =>
      run(() => api.uploadMaterial(classId, title, type, file)),
    downloadMaterial: (id, fileName) => api.downloadMaterial(id, fileName),
    createEvent: (body) => run(() => api.createEvent(body)),
    updateProfile: (body) => run(() => api.updateProfile(body).then((r) => { setUser(r.user); return r; })),
    updatePassword: (current, next) => run(() => api.updatePassword(current, next)),
    createUser: (body) => run(() => api.createUser(body)),
    updateUser: (id, body) => run(() => api.updateUser(id, body)),
    deleteUser: (id) => run(() => api.deleteUser(id)),
    markNotificationRead: (id) => api.markNotificationRead(id).then(refresh),
    markAllNotificationsRead: () => api.markAllNotificationsRead().then(refresh),
    updateSettings: (body) => run(() => api.updateSettings(body)),
    resetData: () => run(() => api.resetData()),
    getClassAttendance: (classId, date) => api.getClassAttendance(classId, date),
    saveClassAttendance: (classId, date, records) =>
      run(() => api.saveClassAttendance(classId, date, records)),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
