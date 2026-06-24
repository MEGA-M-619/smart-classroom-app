import { useState } from 'react';
import { useApp } from '../app-context.js';
import { api } from '../api.js';

export function Onboarding({ user, onComplete }) {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const steps = user.role === 'teacher' ? teacherSteps : user.role === 'admin' ? adminSteps : studentSteps;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const finish = async () => {
    await completeOnboarding();
    onComplete?.();
  };

  return (
    <div className="sca-onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="sca-onboarding__card fade-in">
        <p className="sca-onboarding__step">Step {step + 1} of {steps.length}</p>
        <h2 id="onboarding-title">{current.title}</h2>
        <p>{current.body}</p>
        <ul className="sca-onboarding__list">
          {current.tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <div className="sca-onboarding__actions">
          {step > 0 && <button type="button" className="sca-btn sca-btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button>}
          <button
            type="button"
            className="sca-btn sca-btn-primary"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? 'Get started' : 'Continue'}
          </button>
          <button type="button" className="sca-btn sca-btn-ghost" onClick={finish}>Skip</button>
        </div>
      </div>
    </div>
  );
}

const studentSteps = [
  { title: 'Welcome to SmartClass', body: 'Your personalized learning hub for classes, deadlines, and grades.', tips: ['Join classes with a code from your teacher', 'Track attendance and GPA on your dashboard', 'Submit assignments before due dates'] },
  { title: 'Stay on track', body: 'Use the calendar and notifications so nothing slips through.', tips: ['Check Announcements daily', 'Set learning goals in your dashboard', 'Use AI Study Coach for weekly plans'] },
];

const teacherSteps = [
  { title: 'Welcome, educator', body: 'SmartClass helps you run classes, grade faster, and spot struggling students early.', tips: ['Create a class and share the invite link', 'Post assignments with due dates', 'Use Smart Pulse analytics for at-risk students'] },
  { title: 'AI Studio', body: 'Generate lesson plans, quizzes, and rubrics in seconds.', tips: ['Open AI Studio from the sidebar', 'Export gradebooks to CSV', 'Mark attendance in one click'] },
];

const adminSteps = [
  { title: 'Admin control center', body: 'Manage users, review reports, and keep the platform healthy.', tips: ['Invite teachers and manage roles', 'Review audit logs for security', 'Reset or seed demo data when needed'] },
];
