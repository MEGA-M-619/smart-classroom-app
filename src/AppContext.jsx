import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

import { AppContext } from './app-context.js';

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({
    classes: [],
    assignments: [],
    announcements: [],
    materials: [],
    events: [],
    notifications: [],
    submissions: [],
    users: [],
    settings: {},
    stats: {},
    attendanceSummary: [],
    attendanceRecent: [],
  });
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    const boot = await api.bootstrap();
    setData({
      classes: boot.classes || [],
      assignments: boot.assignments || [],
      announcements: boot.announcements || [],
      materials: boot.materials || [],
      events: boot.events || [],
      notifications: boot.notifications || [],
      submissions: boot.submissions || [],
      users: boot.users || [],
      settings: boot.settings || {},
      stats: boot.stats || {},
      attendanceSummary: boot.attendanceSummary || [],
      attendanceRecent: boot.attendanceRecent || [],
    });
    return boot;
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.me()
      .then(({ user: u }) => {
        setUser(u);
        return refresh();
      })
      .catch((e) => { setError(e.message || 'Your session expired. Please sign in again.'); setToken(null); })
      .finally(() => setLoading(false));
  }, [refresh]);

  const login = async (email, password) => {
    setError(null);
    const { token, user: u } = await api.login(email, password);
    setToken(token);
    setUser(u);
    await refresh();
    return u;
  };

  const register = async (body) => {
    setError(null);
    const { token, user: u } = await api.register(body);
    setToken(token);
    setUser(u);
    await refresh();
    return u;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setData({
      classes: [], assignments: [], announcements: [], materials: [], events: [],
      notifications: [], submissions: [], users: [], settings: {}, stats: {},
      attendanceSummary: [], attendanceRecent: [],
    });
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
    submitAssignment: (assignmentId, file, fileName) =>
      run(() => api.submitAssignment(assignmentId, file, fileName)),
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

