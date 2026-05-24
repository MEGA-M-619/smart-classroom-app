import { api } from '../api.js';

export const classroomService = {
  bootstrap: api.bootstrap,
  createClass: api.createClass,
  joinClass: api.joinClass,
  createAssignment: api.createAssignment,
  submitAssignment: api.submitAssignment,
  gradeSubmission: api.gradeSubmission,
  getClassAttendance: api.getClassAttendance,
  saveClassAttendance: api.saveClassAttendance,
};
