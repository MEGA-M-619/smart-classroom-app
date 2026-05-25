import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, setToken } from './api.js';
import { supabase } from './lib/supabaseClient.js';
import { createDemoWorkspace, findDemoAccount } from './demoData.js';

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
    attendanceRecords: [],
  };
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(emptyData);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRemoteData = useCallback(async () => {
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
      classStudents: boot.classStudents || {},
      settings: boot.settings || {},
      stats: boot.stats || {},
      attendanceSummary: boot.attendanceSummary || [],
      attendanceRecent: boot.attendanceRecent || [],
      attendanceRecords: boot.attendanceRecords || [],
    });
    return boot;
  }, []);

  const refresh = useCallback(async () => {
    if (demoMode) return { user };
    return loadRemoteData();
  }, [demoMode, loadRemoteData, user]);

  useEffect(() => {
    api.me()
      .then(({ user: u }) => {
        setUser(u);
        return loadRemoteData();
      })
      .catch((e) => {
        if (!(e instanceof ApiError) || e.status !== 401) {
          setError(e.message || 'Your session expired. Please sign in again.');
        }
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [loadRemoteData]);

  useEffect(() => {
    if (!user || demoMode) return undefined;
    const channel = supabase
      .channel(`smartclass-live-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [demoMode, refresh, user]);

  const login = async (email, password) => {
    setError(null);
    const demoAccount = findDemoAccount(email, password);
    if (demoAccount) {
      const demo = createDemoWorkspace(demoAccount);
      setDemoMode(true);
      setToken(null);
      setUser(demo.user);
      setData(demo.data);
      return demo.user;
    }

    setDemoMode(false);
    const { token, user: u } = await api.login(email, password);
    setToken(token);
    setUser(u);
    await refresh();
    return u;
  };

  const register = async (body) => {
    setError(null);
    setDemoMode(false);
    const { token, user: u } = await api.register(body);
    setToken(token);
    setUser(u);
    await refresh();
    return u;
  };

  const logout = () => {
    api.logout?.();
    setDemoMode(false);
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

  const demoRun = async (mutator) => {
    setError(null);
    let result;
    setData((current) => {
      const next = mutator(current);
      result = next.result;
      return next.data;
    });
    return result || { ok: true };
  };

  const createDemoClass = (body) => demoRun((current) => {
    const name = String(body.name || body.title || 'New Class').trim();
    const code = `${name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'CLSS'}${Math.floor(1000 + Math.random() * 9000)}`;
    const cls = {
      id: `demo-class-${Date.now()}`,
      name,
      title: name,
      code,
      joinCode: code,
      teacherId: user.id,
      teacher: user.name,
      color: '#6366f1',
      icon: 'CL',
      students: 0,
      description: body.description || '',
      schedule: body.schedule || '',
      room: body.room || '',
      maxStudents: body.maxStudents || 50,
    };
    return {
      data: { ...current, classes: [...current.classes, cls], classStudents: { ...current.classStudents, [cls.id]: [] } },
      result: { class: cls },
    };
  });

  const joinDemoClass = (code) => demoRun((current) => {
    const joined = current.classes.find((cls) => String(cls.joinCode || cls.code).toLowerCase() === String(code).trim().toLowerCase());
    if (!joined) throw new ApiError('Class not found. Try SOFT2481 or DATA9021.', { status: 404 });
    return { data: current, result: { class: joined } };
  });

  const createDemoAssignment = (body) => demoRun((current) => {
    const assignment = {
      id: `demo-assignment-${Date.now()}`,
      classId: body.classId,
      title: body.title || 'Untitled Assignment',
      description: body.description || '',
      dueDate: body.dueDate,
      points: Number(body.points || 100),
      status: 'active',
      submissions: 0,
      type: body.type || 'Assignment',
    };
    const event = {
      id: `demo-event-${Date.now()}`,
      title: assignment.title,
      date: assignment.dueDate,
      type: String(assignment.type).toLowerCase() === 'quiz' ? 'quiz' : 'assignment',
      color: '#6366f1',
      classId: assignment.classId,
    };
    return {
      data: { ...current, assignments: [...current.assignments, assignment], events: [...current.events, event] },
      result: { assignment },
    };
  });

  const submitDemoAssignment = (assignmentId, file, fileName, textAnswer = '') => demoRun((current) => {
    if (!String(textAnswer || '').trim() && !file) {
      throw new ApiError('Add a text answer or upload a file before submitting.', { status: 400 });
    }
    const submission = {
      id: `demo-submission-${Date.now()}`,
      assignmentId,
      studentId: user.id,
      studentName: user.name,
      avatar: user.avatar,
      submittedAt: new Date().toISOString(),
      file: file?.name || fileName || '',
      filePath: null,
      fileUrl: null,
      textAnswer,
      grade: null,
      feedback: '',
      status: 'submitted',
    };
    return {
      data: {
        ...current,
        submissions: [...current.submissions.filter((item) => !(item.assignmentId === assignmentId && item.studentId === user.id)), submission],
        assignments: current.assignments.map((assignment) => assignment.id === assignmentId
          ? { ...assignment, submitted: true, submissionStatus: 'submitted', submissions: Math.max(assignment.submissions || 0, 1) }
          : assignment),
      },
      result: { submission },
    };
  });

  const gradeDemoSubmission = (id, grade, feedback) => demoRun((current) => {
    let graded = null;
    const submissions = current.submissions.map((submission) => {
      if (submission.id !== id) return submission;
      graded = { ...submission, grade, feedback: feedback || '', status: 'graded' };
      return graded;
    });
    return { data: { ...current, submissions }, result: { submission: graded } };
  });

  const createDemoAnnouncement = (body) => demoRun((current) => {
    const announcement = {
      id: `demo-announcement-${Date.now()}`,
      classId: body.classId,
      title: body.title || 'Announcement',
      body: body.body || '',
      teacher: user.name,
      avatar: user.avatar,
      date: new Date().toISOString().slice(0, 10),
      pinned: !!body.pinned,
      color: current.classes.find((cls) => cls.id === body.classId)?.color || '#6366f1',
    };
    return { data: { ...current, announcements: [announcement, ...current.announcements] }, result: { announcement } };
  });

  const uploadDemoMaterial = (classId, title, type, file) => demoRun((current) => {
    const material = {
      id: `demo-material-${Date.now()}`,
      classId,
      title: title || file?.name || 'Material',
      type: type || 'pdf',
      size: file?.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Demo file',
      date: new Date().toISOString().slice(0, 10),
      icon: 'FILE',
      filePath: null,
      fileName: file?.name || title || 'Material',
    };
    return { data: { ...current, materials: [material, ...current.materials] }, result: { material } };
  });

  const createDemoEvent = (body) => demoRun((current) => {
    const event = {
      id: `demo-event-${Date.now()}`,
      title: body.title || 'Event',
      date: body.date,
      type: body.type || 'event',
      color: body.color || '#10b981',
      classId: body.classId || null,
    };
    return { data: { ...current, events: [...current.events, event] }, result: { event } };
  });

  const getDemoClassAttendance = async (classId, date) => {
    const roster = data.classStudents[classId] || [];
    const rows = data.attendanceRecords.filter((record) => record.classId === classId);
    const records = roster.map((student) => {
      const existing = rows.find((row) => row.studentId === student.id && row.sessionDate === date);
      return {
        id: existing?.id,
        studentId: student.id,
        studentName: student.name,
        avatar: student.avatar,
        status: existing?.status || 'present',
        note: existing?.note || '',
      };
    });
    const history = [...new Set(rows.map((row) => row.sessionDate))].sort().reverse().map((sessionDate) => {
      const sessionRows = rows.filter((row) => row.sessionDate === sessionDate);
      const presentCount = sessionRows.filter((row) => row.status === 'present' || row.status === 'late').length;
      return {
        date: sessionDate,
        presentCount,
        total: sessionRows.length,
        percentage: sessionRows.length ? Math.round((presentCount / sessionRows.length) * 100) : 0,
      };
    });
    return { records, history, sessionDate: date };
  };

  const saveDemoClassAttendance = (classId, date, records) => demoRun((current) => {
    const kept = current.attendanceRecords.filter((record) => !(record.classId === classId && record.sessionDate === date));
    const saved = records.map((record) => ({
      id: record.id || `demo-attendance-${record.studentId}-${date}`,
      classId,
      studentId: record.studentId,
      studentName: record.studentName,
      sessionDate: date,
      status: record.status || 'present',
      note: record.note || '',
    }));
    return { data: { ...current, attendanceRecords: [...kept, ...saved] }, result: { records: saved, sessionDate: date } };
  });

  const updateDemoProfile = async (body) => {
    const updated = {
      ...user,
      ...body,
      name: body.name ?? body.fullName ?? user.name,
      fullName: body.name ?? body.fullName ?? user.fullName,
    };
    setUser(updated);
    return { user: updated };
  };

  const createDemoUser = (body) => demoRun((current) => {
    const name = body.name || body.fullName || body.email;
    const newUser = {
      id: `demo-user-${Date.now()}`,
      name,
      fullName: name,
      email: body.email,
      role: body.role || 'student',
      avatar: String(name || 'U').slice(0, 2).toUpperCase(),
      darkMode: false,
      emailNotifications: true,
    };
    return { data: { ...current, users: [...current.users, newUser] }, result: { user: newUser } };
  });

  const updateDemoUser = (id, body) => demoRun((current) => {
    let updated = null;
    const users = current.users.map((item) => {
      if (item.id !== id) return item;
      updated = {
        ...item,
        ...body,
        name: body.name || body.fullName || item.name,
        fullName: body.name || body.fullName || item.fullName,
      };
      return updated;
    });
    return { data: { ...current, users }, result: { user: updated } };
  });

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
    createClass: (body) => demoMode ? createDemoClass(body) : run(() => api.createClass(body)),
    joinClass: (code) => demoMode ? joinDemoClass(code) : run(() => api.joinClass(code)),
    createAssignment: (body) => demoMode ? createDemoAssignment(body) : run(() => api.createAssignment(body)),
    submitAssignment: (assignmentId, file, fileName, textAnswer) =>
      demoMode ? submitDemoAssignment(assignmentId, file, fileName, textAnswer) : run(() => api.submitAssignment(assignmentId, file, fileName, textAnswer)),
    gradeSubmission: (id, grade, feedback) => demoMode ? gradeDemoSubmission(id, grade, feedback) : run(() => api.gradeSubmission(id, grade, feedback)),
    downloadSubmission: (id, fileName) => demoMode ? Promise.resolve({ ok: true, id, fileName }) : api.downloadSubmission(id, fileName),
    createAnnouncement: (body) => demoMode ? createDemoAnnouncement(body) : run(() => api.createAnnouncement(body)),
    uploadMaterial: (classId, title, type, file) =>
      demoMode ? uploadDemoMaterial(classId, title, type, file) : run(() => api.uploadMaterial(classId, title, type, file)),
    downloadMaterial: (id, fileName) => demoMode ? Promise.resolve({ ok: true, id, fileName }) : api.downloadMaterial(id, fileName),
    createEvent: (body) => demoMode ? createDemoEvent(body) : run(() => api.createEvent(body)),
    updateProfile: (body) => demoMode ? updateDemoProfile(body) : run(() => api.updateProfile(body).then((r) => { setUser(r.user); return r; })),
    updatePassword: (current, next) => demoMode ? Promise.resolve({ ok: true, current, next }) : run(() => api.updatePassword(current, next)),
    createUser: (body) => demoMode ? createDemoUser(body) : run(() => api.createUser(body)),
    updateUser: (id, body) => demoMode ? updateDemoUser(id, body) : run(() => api.updateUser(id, body)),
    deleteUser: (id) => demoMode
      ? demoRun((current) => ({ data: { ...current, users: current.users.filter((item) => item.id !== id) }, result: { ok: true } }))
      : run(() => api.deleteUser(id)),
    markNotificationRead: (id) => demoMode
      ? demoRun((current) => ({ data: { ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item) }, result: { ok: true } }))
      : api.markNotificationRead(id).then(refresh),
    markAllNotificationsRead: () => demoMode
      ? demoRun((current) => ({ data: { ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }, result: { ok: true } }))
      : api.markAllNotificationsRead().then(refresh),
    updateSettings: (body) => demoMode
      ? demoRun((current) => ({ data: { ...current, settings: { ...current.settings, ...body } }, result: { ok: true } }))
      : run(() => api.updateSettings(body)),
    resetData: () => demoMode
      ? demoRun((current) => ({ data: { ...current, classes: [], assignments: [], announcements: [], materials: [], events: [], submissions: [], classStudents: {} }, result: { ok: true } }))
      : run(() => api.resetData()),
    getClassAttendance: (classId, date) => demoMode ? getDemoClassAttendance(classId, date) : api.getClassAttendance(classId, date),
    saveClassAttendance: (classId, date, records) =>
      demoMode ? saveDemoClassAttendance(classId, date, records) : run(() => api.saveClassAttendance(classId, date, records)),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
