import { useApp } from '../app-context.js';

export function useAuth() {
  const { user, loading, login, register, logout } = useApp();
  return {
    user,
    loading,
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    login,
    register,
    logout,
  };
}
