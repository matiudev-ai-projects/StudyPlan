import { todayISO } from "./dateUtils";

const KEY = "studyplan_snapshot";

export function getSnapshot() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (snap.date !== todayISO()) return null;
    return snap.sessions;
  } catch {
    return null;
  }
}

export function saveSnapshot(sessions) {
  localStorage.setItem(KEY, JSON.stringify({ date: todayISO(), sessions }));
}

export function clearSnapshot() {
  localStorage.removeItem(KEY);
}

/**
 * Actualiza el estado `completed` de cada sesión del snapshot
 * leyendo el estado real desde la base de datos.
 */
export function syncSnapshot(sessions, evaluations) {
  return sessions.map((s) => {
    const ev = evaluations.find((e) => e.id === s.eval_id);
    if (!ev) return s;

    if (s.is_review) {
      const topic = ev.topics.find((t) => t.id === s.topic_id);
      const review = topic?.reviews?.find((r) => r.id === s.review_id);
      return { ...s, completed: review?.completed ?? false };
    }

    const topic = ev.topics.find((t) => t.id === s.topic_id);
    if (!topic) return s;

    if (s.subtopic_id) {
      const sub = topic.subtopics?.find((su) => su.id === s.subtopic_id);
      return { ...s, completed: sub?.completed ?? false };
    }
    return { ...s, completed: topic.completed ?? false };
  });
}
