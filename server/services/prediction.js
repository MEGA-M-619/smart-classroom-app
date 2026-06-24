import { db } from '../db.js';

function discussionCount(studentId, classIds) {
  if (!classIds.length) return 0;
  const ph = classIds.map(() => '?').join(',');
  const threads = db.prepare(`
    SELECT COUNT(*) as c FROM discussion_threads
    WHERE author_id = ? AND class_id IN (${ph})
  `).get(studentId, ...classIds)?.c || 0;
  const replies = db.prepare(`
    SELECT COUNT(*) as c FROM discussion_replies dr
    JOIN discussion_threads dt ON dt.id = dr.thread_id
    WHERE dr.author_id = ? AND dt.class_id IN (${ph})
  `).get(studentId, ...classIds)?.c || 0;
  return threads + replies;
}

function gradeTrend(studentId, classId) {
  const rows = db.prepare(`
    SELECT s.grade, a.points, s.submitted_at
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ? AND a.class_id = ? AND s.status = 'graded' AND s.grade IS NOT NULL
    ORDER BY s.submitted_at ASC
  `).all(studentId, classId);
  if (rows.length < 2) return 0;
  const first = (Number(rows[0].grade) / Number(rows[0].points)) * 100;
  const last = (Number(rows.at(-1).grade) / Number(rows.at(-1).points)) * 100;
  return last - first;
}

export function predictStudentPerformance(studentId, classId = null) {
  const student = db.prepare('SELECT id, name, email, avatar FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
  if (!student) return null;

  const classIds = classId
    ? [classId]
    : db.prepare('SELECT class_id FROM enrollments WHERE user_id = ?').all(studentId).map((r) => r.class_id);

  if (!classIds.length) {
    return {
      studentId,
      name: student.name,
      riskScore: 0,
      level: 'low',
      prediction: 'Insufficient data',
      reasoning: ['Student is not enrolled in any classes yet.'],
      interventions: ['Ensure enrollment is complete.'],
      studyPlan: ['Review class schedule and join required courses.'],
      indicators: { attendanceRate: null, completionRate: null, gradeTrend: 0, discussions: 0 },
    };
  }

  const ph = classIds.map(() => '?').join(',');
  const totalAssignments = db.prepare(`
    SELECT COUNT(*) as c FROM assignments WHERE class_id IN (${ph}) AND status = 'active'
  `).get(...classIds)?.c || 0;

  const submitted = db.prepare(`
    SELECT COUNT(*) as c FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ? AND a.class_id IN (${ph})
  `).get(studentId, ...classIds)?.c || 0;

  const missing = Math.max(0, totalAssignments - submitted);
  const completionRate = totalAssignments ? Math.round((submitted / totalAssignments) * 100) : 100;

  const attendance = db.prepare(`
    SELECT
      COUNT(ar.id) as total,
      SUM(CASE WHEN ar.status IN ('present','late') THEN 1 ELSE 0 END) as present
    FROM attendance_records ar
    JOIN attendance_sessions s ON s.id = ar.session_id
    WHERE ar.student_id = ? AND s.class_id IN (${ph})
  `).get(studentId, ...classIds);
  const totalSessions = Number(attendance?.total) || 0;
  const presentCount = Number(attendance?.present) || 0;
  const attendanceRate = totalSessions ? Math.round((presentCount / totalSessions) * 100) : 100;
  const absences = totalSessions - presentCount;

  const graded = db.prepare(`
    SELECT s.grade, a.points
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ? AND a.class_id IN (${ph}) AND s.status = 'graded' AND s.grade IS NOT NULL
  `).all(studentId, ...classIds);
  const avgPercent = graded.length
    ? graded.reduce((sum, r) => sum + (Number(r.grade) / Number(r.points)) * 100, 0) / graded.length
    : null;

  const trend = classId ? gradeTrend(studentId, classId) : 0;
  const discussions = discussionCount(studentId, classIds);

  let riskScore = 0;
  const reasoning = [];

  if (attendanceRate < 75) {
    riskScore += 3;
    reasoning.push(`Attendance is ${attendanceRate}% (below 75% threshold).`);
  } else if (attendanceRate < 90) {
    riskScore += 1;
    reasoning.push(`Attendance is ${attendanceRate}% — monitor closely.`);
  } else {
    reasoning.push(`Strong attendance at ${attendanceRate}%.`);
  }

  if (completionRate < 60) {
    riskScore += 3;
    reasoning.push(`Only ${completionRate}% of assignments submitted (${missing} missing).`);
  } else if (completionRate < 85) {
    riskScore += 1;
    reasoning.push(`Assignment completion at ${completionRate}%.`);
  } else {
    reasoning.push(`Healthy assignment completion (${completionRate}%).`);
  }

  if (avgPercent != null && avgPercent < 65) {
    riskScore += 3;
    reasoning.push(`Average grade is ${Math.round(avgPercent)}% — below passing benchmark.`);
  } else if (avgPercent != null && avgPercent < 80) {
    riskScore += 1;
    reasoning.push(`Average grade is ${Math.round(avgPercent)}%.`);
  } else if (avgPercent != null) {
    reasoning.push(`Grades averaging ${Math.round(avgPercent)}%.`);
  }

  if (trend < -10) {
    riskScore += 2;
    reasoning.push(`Grade trend declining (${Math.round(trend)} pts over recent work).`);
  } else if (trend > 5) {
    reasoning.push(`Improving grade trend (+${Math.round(trend)} pts).`);
  }

  if (discussions < 2 && totalAssignments > 3) {
    riskScore += 1;
    reasoning.push('Low discussion participation may indicate disengagement.');
  }

  const level = riskScore >= 6 ? 'high' : riskScore >= 3 ? 'medium' : 'low';
  const prediction = level === 'high'
    ? 'High risk of underperformance without intervention'
    : level === 'medium'
      ? 'Moderate risk — early support recommended'
      : 'On track to meet learning goals';

  const interventions = [];
  if (absences > 2) interventions.push('Schedule a check-in about attendance barriers.');
  if (missing > 0) interventions.push(`Prioritize ${missing} missing assignment(s) with a catch-up plan.`);
  if (avgPercent != null && avgPercent < 75) interventions.push('Offer office hours or tutoring for challenging topics.');
  if (discussions < 2) interventions.push('Encourage participation in class discussions.');
  if (!interventions.length) interventions.push('Continue current support — student is progressing well.');

  const studyPlan = [
    missing > 0 ? `Complete ${missing} overdue assignment(s) this week.` : 'Maintain weekly assignment rhythm.',
    attendanceRate < 90 ? 'Set reminders for class sessions.' : 'Keep consistent attendance.',
    avgPercent != null && avgPercent < 80 ? 'Review graded work and revise weak areas.' : 'Challenge yourself with extension activities.',
  ];

  return {
    studentId,
    name: student.name,
    email: student.email,
    avatar: student.avatar,
    classId,
    riskScore,
    level,
    prediction,
    reasoning,
    interventions,
    studyPlan,
    indicators: {
      attendanceRate,
      completionRate,
      avgPercent: avgPercent != null ? Math.round(avgPercent) : null,
      gradeTrend: Math.round(trend),
      discussions,
      missingAssignments: missing,
      absences,
    },
  };
}

export function predictClassRoster(classId) {
  const students = db.prepare(`
    SELECT u.id FROM users u
    JOIN enrollments e ON e.user_id = u.id
    WHERE e.class_id = ? AND u.role = 'student'
  `).all(classId);
  const cls = db.prepare('SELECT name FROM classes WHERE id = ?').get(classId);
  return students
    .map((s) => predictStudentPerformance(s.id, classId))
    .filter(Boolean)
    .map((p) => ({ ...p, className: cls?.name }))
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function predictSchoolWide() {
  const students = db.prepare(`SELECT id FROM users WHERE role = 'student'`).all();
  const predictions = students.map((s) => predictStudentPerformance(s.id)).filter(Boolean);
  const high = predictions.filter((p) => p.level === 'high').length;
  const medium = predictions.filter((p) => p.level === 'medium').length;
  const low = predictions.filter((p) => p.level === 'low').length;
  const avgCompletion = predictions.length
    ? Math.round(predictions.reduce((s, p) => s + p.indicators.completionRate, 0) / predictions.length)
    : 0;
  const avgAttendance = predictions.length
    ? Math.round(predictions.reduce((s, p) => s + p.indicators.attendanceRate, 0) / predictions.length)
    : 0;
  return {
    summary: { high, medium, low, total: predictions.length, avgCompletion, avgAttendance },
    atRisk: predictions.filter((p) => p.level !== 'low').slice(0, 25),
    all: predictions,
  };
}
