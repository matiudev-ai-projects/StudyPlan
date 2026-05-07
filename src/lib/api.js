import { todayISO, addDays } from "./dateUtils";
import { REVIEW_INTERVALS } from "./studyUtils";
import { getSnapshot, saveSnapshot, clearSnapshot, syncSnapshot } from "./snapshot";
import { buildPlan } from "./scheduler";
import { computeWarnings } from "./warnings";
import { computeStats } from "./stats";

// ─── Base de datos (localStorage) ─────────────────────────────────────────

const DB_KEY = "studyplan_data";

function getDB() {
  return (
    JSON.parse(localStorage.getItem(DB_KEY)) || {
      evaluations: [],
      skippedDays: [],
    }
  );
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export { todayISO, clearSnapshot };

// ─── Settings ──────────────────────────────────────────────────────────────

const SETTINGS_KEY = "studyplan_settings";

export const getSettings = () => {
  try {
    return (
      JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { hours_per_day: 2 }
    );
  } catch {
    return { hours_per_day: 2 };
  }
};

export const setSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  clearSnapshot();
};

// ─── Evaluaciones ──────────────────────────────────────────────────────────

export const getEvaluation = async (id) => {
  return getDB().evaluations.find((e) => e.id === id);
};

export const listEvaluations = async () => {
  return getDB().evaluations;
};

export const createEvaluation = async (payload) => {
  const db = getDB();

  const newEval = {
    id: crypto.randomUUID(),
    ...payload,
    topics: payload.topics.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      completed: false,
      completed_at: null,
      reviews: [],
      subtopics: (t.subtopics || []).map((sub) => ({
        id: crypto.randomUUID(),
        name: typeof sub === "string" ? sub : sub.name,
        completed: false,
      })),
    })),
  };

  db.evaluations.push(newEval);
  saveDB(db);
  clearSnapshot();
  return newEval;
};

export const updateEvaluation = async (id, payload) => {
  const db = getDB();
  const i = db.evaluations.findIndex((e) => e.id === id);
  if (i === -1) return;

  const existing = db.evaluations[i];

  const updatedTopics = payload.topics.map((t) => {
    const existingTopic = existing.topics.find((et) => et.id === t.id);

    const updatedSubtopics = (t.subtopics || []).map((sub) => {
      const subName = typeof sub === "string" ? sub : sub.name;
      const subId = typeof sub === "object" && sub.id ? sub.id : null;
      const existingSub = existingTopic?.subtopics?.find(
        (es) => (subId && es.id === subId) || es.name === subName,
      );
      return {
        id: existingSub?.id || crypto.randomUUID(),
        name: subName,
        completed: existingSub?.completed || false,
      };
    });

    return {
      id: existingTopic?.id || crypto.randomUUID(),
      name: t.name,
      difficulty: t.difficulty,
      completed:
        updatedSubtopics.length > 0
          ? updatedSubtopics.every((s) => s.completed)
          : existingTopic?.completed || false,
      completed_at: existingTopic?.completed_at || null,
      reviews: existingTopic?.reviews || [],
      subtopics: updatedSubtopics,
    };
  });

  db.evaluations[i] = {
    ...existing,
    name: payload.name,
    type: payload.type || "evaluation",
    exam_date: payload.exam_date ?? null,
    weeks_goal: payload.weeks_goal ?? null,
    hours_per_day: payload.hours_per_day,
    topics: updatedTopics,
  };

  saveDB(db);
  clearSnapshot();
  return db.evaluations[i];
};

export const deleteEvaluation = async (id) => {
  const db = getDB();
  db.evaluations = db.evaluations.filter((e) => e.id !== id);
  saveDB(db);
  clearSnapshot();
};

// ─── Toggle temas / subtemas ───────────────────────────────────────────────

export const toggleTopic = async (eid, tid) => {
  const db = getDB();
  const ev = db.evaluations.find((e) => e.id === eid);
  if (!ev) return;

  const topic = ev.topics.find((t) => t.id === tid);
  if (!topic) return;

  topic.completed = !topic.completed;
  topic.completed_at = topic.completed ? new Date().toISOString() : null;

  if (topic.subtopics?.length > 0) {
    topic.subtopics.forEach((s) => { s.completed = topic.completed; });
  }

  topic.reviews = topic.completed ? buildReviews() : [];

  saveDB(db);
  // No se limpia el snapshot: el estado `completed` se sincroniza en caliente
};

export const toggleSubtopic = async (eid, tid, sid) => {
  const db = getDB();
  const ev = db.evaluations.find((e) => e.id === eid);
  if (!ev) return;

  const topic = ev.topics.find((t) => t.id === tid);
  if (!topic) return;

  const sub = topic.subtopics.find((s) => s.id === sid);
  if (!sub) return;

  const wasDone = topic.completed;
  sub.completed = !sub.completed;

  const allDone = topic.subtopics.every((s) => s.completed);
  topic.completed = allDone;
  topic.completed_at = allDone ? new Date().toISOString() : null;

  if (allDone && !wasDone) topic.reviews = buildReviews();
  else if (!allDone && wasDone) topic.reviews = [];

  saveDB(db);
};

export const toggleReview = async (eid, tid, reviewId) => {
  const db = getDB();
  const ev = db.evaluations.find((e) => e.id === eid);
  if (!ev) return;

  const topic = ev.topics.find((t) => t.id === tid);
  if (!topic?.reviews) return;

  const review = topic.reviews.find((r) => r.id === reviewId);
  if (!review) return;

  review.completed = !review.completed;
  review.completed_at = review.completed ? new Date().toISOString() : null;

  saveDB(db);
};

function buildReviews() {
  const today = todayISO();
  return REVIEW_INTERVALS.map((days, i) => ({
    id: crypto.randomUUID(),
    review_number: i + 1,
    scheduled_for: addDays(today, days),
    completed: false,
    completed_at: null,
  }));
}

// ─── Días salteados ────────────────────────────────────────────────────────

export const listSkippedDays = async () => getDB().skippedDays;

export const addSkippedDay = async (date) => {
  const db = getDB();
  if (!db.skippedDays.find((d) => d.date === date)) {
    db.skippedDays.push({ date });
    saveDB(db);
  }
  if (date === todayISO()) clearSnapshot();
  return db.skippedDays;
};

export const removeSkippedDay = async (date) => {
  const db = getDB();
  db.skippedDays = db.skippedDays.filter((d) => d.date !== date);
  saveDB(db);
  if (date === todayISO()) clearSnapshot();
  return db.skippedDays;
};

// ─── Horas extra ───────────────────────────────────────────────────────────

export const getExtraHours = (date) => {
  return parseFloat(localStorage.getItem(`extra_hours_${date}`) || "0");
};

export const setExtraHours = (date, hours) => {
  localStorage.setItem(`extra_hours_${date}`, String(hours));
  if (date === todayISO()) clearSnapshot();
};

// ─── Hoy ───────────────────────────────────────────────────────────────────

export const getToday = async () => {
  const today = todayISO();
  const db = getDB();

  // Usar snapshot si existe (plan congelado del día)
  const snap = getSnapshot();
  if (snap) {
    const sessions = syncSnapshot(snap, db.evaluations);
    return {
      date: today,
      sessions,
      total_minutes: sessions.reduce((s, x) => s + x.minutes, 0),
    };
  }

  // Generar plan fresco y guardar snapshot
  const settings = getSettings();
  const extraHours = getExtraHours(today);
  const skippedDays = db.skippedDays.map((d) => d.date);

  const plan = buildPlan(db.evaluations, settings, today, skippedDays, extraHours);
  const todayPlan = plan.days.find((d) => d.date === today) ?? {
    date: today,
    sessions: [],
    total_minutes: 0,
  };

  saveSnapshot(todayPlan.sessions);
  return todayPlan;
};

// ─── Plan completo ─────────────────────────────────────────────────────────

export const getPlan = async (extraHoursOverride = 0) => {
  const db = getDB();
  const today = todayISO();
  const settings = getSettings();
  const extraHours = extraHoursOverride || getExtraHours(today);
  const skippedDays = db.skippedDays.map((d) => d.date);

  return buildPlan(db.evaluations, settings, today, skippedDays, extraHours);
};

// ─── Stats ─────────────────────────────────────────────────────────────────

export const getStats = async () => {
  const db = getDB();
  return computeStats(db.evaluations, todayISO());
};

// ─── Warnings ──────────────────────────────────────────────────────────────

export const getWarnings = () => {
  const db = getDB();
  const settings = getSettings();
  const skippedDays = db.skippedDays.map((d) => d.date);
  return computeWarnings(db.evaluations, settings, todayISO(), skippedDays);
};

// ─── Export / Import ───────────────────────────────────────────────────────

export const exportData = () => {
  const raw = localStorage.getItem(DB_KEY);
  const studyplanData = raw
    ? JSON.parse(raw)
    : { evaluations: [], skippedDays: [] };

  const extraHours = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("extra_hours_")) extraHours[key] = localStorage.getItem(key);
  }

  return {
    version: 2,
    exported_at: new Date().toISOString(),
    studyplan_data: studyplanData,
    settings: getSettings(),
    extra_hours: extraHours,
  };
};

export const importData = (data) => {
  if (!data?.studyplan_data?.evaluations) throw new Error("Formato inválido");

  localStorage.setItem(DB_KEY, JSON.stringify(data.studyplan_data));

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("extra_hours_")) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  if (data.extra_hours) {
    Object.entries(data.extra_hours).forEach(([k, v]) => localStorage.setItem(k, v));
  }
  if (data.settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
  }
  clearSnapshot();
};
