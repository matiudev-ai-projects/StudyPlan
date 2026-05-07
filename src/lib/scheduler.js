import { dateRange, addDays, daysBetween } from "./dateUtils";
import {
  topicMinutes,
  reviewMinutes,
  difficultyWeight,
  buildPendingItems,
  buildPendingReviews,
  totalPendingMinutes,
  minTopicMinutes,
  avgDifficultyWeight,
  REVIEW_INTERVALS,
} from "./studyUtils";

// ─── Allocación de tiempo entre evaluaciones ───────────────────────────────

function allocateEvalTime(evaluations, totalMinutes, today) {
  const weights = {};
  let totalWeight = 0;

  for (const ev of evaluations) {
    const pending = totalPendingMinutes(ev);
    if (pending === 0) continue;
    const daysLeft = Math.max(1, daysBetween(today, ev.exam_date));
    const urgency = 1 / daysLeft;
    const difficulty = avgDifficultyWeight(ev);
    const w = urgency * (1 + difficulty);
    weights[ev.id] = w;
    totalWeight += w;
  }

  if (totalWeight === 0) return {};

  // Ordenar de mayor a menor peso para el reparto greedy
  const sorted = evaluations
    .filter((ev) => weights[ev.id] !== undefined)
    .sort((a, b) => weights[b.id] - weights[a.id]);

  const alloc = {};
  let pool = totalMinutes;

  for (const ev of sorted) {
    const pending = totalPendingMinutes(ev);
    const minNeeded = minTopicMinutes(ev);
    const proportional = Math.round((weights[ev.id] / totalWeight) * totalMinutes);

    if (pool >= minNeeded) {
      const give = Math.min(Math.max(proportional, minNeeded), pool, pending);
      alloc[ev.id] = give;
      pool -= give;
    } else {
      alloc[ev.id] = 0;
    }
  }

  return alloc;
}

// ─── Sesiones de un solo día ───────────────────────────────────────────────

function buildDaySessions(
  evaluations,
  projects,
  pendingQueues,
  reviewQueues,
  projectQueues,
  consumedSubtopics, // { evalId: { topicId: count } } para detectar cuándo revisar
  totalSubtopics,    // { evalId: { topicId: total } }
  date,
  totalMinutes,
  today,
) {
  const sessions = [];

  // ── 1. Evaluaciones ──────────────────────────────────────────────────────
  const activeEvals = evaluations.filter((ev) => {
    if (!ev.exam_date || ev.exam_date < date) return false;
    const hasPendingTopics = (pendingQueues[ev.id]?.length ?? 0) > 0;
    const hasDueReviews = reviewQueues[ev.id]?.some((r) => r.scheduled_for <= date) ?? false;
    return hasPendingTopics || hasDueReviews;
  });

  const evalAlloc = allocateEvalTime(activeEvals, totalMinutes, today);

  // Procesar en orden de mayor asignación
  const sortedEvals = [...activeEvals].sort(
    (a, b) => (evalAlloc[b.id] ?? 0) - (evalAlloc[a.id] ?? 0),
  );

  for (const ev of sortedEvals) {
    let minutesLeft = evalAlloc[ev.id] ?? 0;
    const pending = pendingQueues[ev.id] ?? [];
    let overflowUsed = false;

    // ── Temas nuevos ─────────────────────────────────────────────────────
    while (pending.length > 0) {
      const item = pending[0];
      const mins = topicMinutes(item.difficulty);
      const fits = mins <= minutesLeft;

      if (fits) {
        sessions.push(makeTopicSession(ev, item, mins, false));
        pending.shift();
        minutesLeft -= mins;
        registerConsumed(ev.id, item, consumedSubtopics, totalSubtopics, reviewQueues, date);
      } else if (item.difficulty === "dificil" && !overflowUsed) {
        // Tema difícil que no entra: agregar igual con advertencia
        sessions.push(makeTopicSession(ev, item, mins, true));
        pending.shift();
        minutesLeft -= mins; // puede quedar negativo
        overflowUsed = true;
        registerConsumed(ev.id, item, consumedSubtopics, totalSubtopics, reviewQueues, date);
        break;
      } else {
        break;
      }
    }

    // ── Repasos vencidos ─────────────────────────────────────────────────
    const dueReviews = (reviewQueues[ev.id] ?? []).filter(
      (r) => r.scheduled_for <= date,
    );
    for (const review of dueReviews) {
      if (minutesLeft <= 0) break;
      if (review.minutes > minutesLeft) continue;
      sessions.push(makeReviewSession(ev, review));
      // Marcar como consumido del queue
      const idx = reviewQueues[ev.id].findIndex((r) => r.id === review.id);
      if (idx !== -1) reviewQueues[ev.id].splice(idx, 1);
      minutesLeft -= review.minutes;
    }
  }

  // ── 2. Proyectos (tiempo sobrante) ───────────────────────────────────────
  const usedMinutes = sessions.reduce((s, x) => s + x.minutes, 0);
  let projectPool = Math.max(0, totalMinutes - usedMinutes);

  for (const ev of projects) {
    const pending = projectQueues[ev.id] ?? [];
    while (pending.length > 0 && projectPool > 0) {
      const item = pending[0];
      const mins = topicMinutes(item.difficulty);
      if (mins > projectPool) break;
      sessions.push(makeTopicSession(ev, item, mins, false));
      pending.shift();
      projectPool -= mins;
    }
  }

  return sessions;
}

// ─── Helpers para construir objetos de sesión ──────────────────────────────

function makeTopicSession(ev, item, minutes, isOverflow) {
  return {
    eval_id: ev.id,
    eval_name: ev.name,
    topic_id: item.parentId ?? item.id,
    subtopic_id: item.parentId ? item.id : null,
    topic_name: item.parentId ? item.parentName : item.name,
    subtopic_name: item.parentId ? item.name : null,
    difficulty: item.difficulty,
    minutes,
    completed: false,
    is_review: false,
    is_overflow: isOverflow,
    review_id: null,
  };
}

function makeReviewSession(ev, review) {
  return {
    eval_id: ev.id,
    eval_name: ev.name,
    topic_id: review.topic_id,
    subtopic_id: null,
    topic_name: review.topic_name,
    subtopic_name: null,
    difficulty: review.difficulty,
    minutes: review.minutes,
    completed: false,
    is_review: true,
    is_overflow: false,
    review_id: review.id,
    review_number: review.review_number,
  };
}

// ─── Registro de consumo para repasos simulados ────────────────────────────

function registerConsumed(evalId, item, consumedSubtopics, totalSubtopics, reviewQueues, date) {
  if (!item.parentId) {
    // Tema sin subtemas: agregar repasos directamente
    scheduleSimulatedReviews(evalId, item.id, item.name, item.difficulty, reviewQueues, date);
    return;
  }
  // Subtema: incrementar contador del tema padre
  if (!consumedSubtopics[evalId]) consumedSubtopics[evalId] = {};
  consumedSubtopics[evalId][item.parentId] =
    (consumedSubtopics[evalId][item.parentId] ?? 0) + 1;

  const total = totalSubtopics[evalId]?.[item.parentId] ?? 0;
  if (consumedSubtopics[evalId][item.parentId] >= total) {
    // Todos los subtemas del tema padre fueron consumidos
    scheduleSimulatedReviews(evalId, item.parentId, item.parentName, item.difficulty, reviewQueues, date);
  }
}

function scheduleSimulatedReviews(evalId, topicId, topicName, difficulty, reviewQueues, date) {
  if (!reviewQueues[evalId]) reviewQueues[evalId] = [];
  REVIEW_INTERVALS.forEach((days, i) => {
    reviewQueues[evalId].push({
      id: `sim_${topicId}_${i}`,
      review_number: i + 1,
      scheduled_for: addDays(date, days),
      topic_id: topicId,
      topic_name: topicName,
      difficulty,
      minutes: reviewMinutes(difficulty),
      overdue_days: 0,
    });
  });
  // Re-ordenar por fecha y prioridad
  reviewQueues[evalId].sort((a, b) => {
    if (a.scheduled_for !== b.scheduled_for) return a.scheduled_for.localeCompare(b.scheduled_for);
    return difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty);
  });
}

// ─── Plan completo ─────────────────────────────────────────────────────────

export function buildPlan(allEvaluations, settings, today, skippedDays = [], extraHoursToday = 0) {
  const hoursPerDay = settings.hours_per_day ?? 2;
  const skipped = new Set(skippedDays);

  const evaluations = allEvaluations.filter(
    (ev) => ev.type !== "project" && ev.exam_date,
  );
  const projects = allEvaluations.filter((ev) => ev.type === "project");

  // Determinar hasta qué fecha planificar
  let planEnd = null;
  for (const ev of evaluations) {
    if (!planEnd || ev.exam_date > planEnd) planEnd = ev.exam_date;
  }
  for (const ev of projects) {
    const d = addDays(today, (ev.weeks_goal ?? 4) * 7);
    if (!planEnd || d > planEnd) planEnd = d;
  }
  if (!planEnd) return { days: [] };

  // Construir colas mutables por evaluación
  const pendingQueues = {};
  const reviewQueues = {};
  const projectQueues = {};

  // Contadores para detectar cuándo todos los subtemas de un tema fueron consumidos
  const consumedSubtopics = {};
  const totalSubtopics = {};

  for (const ev of evaluations) {
    pendingQueues[ev.id] = buildPendingItems(ev);
    reviewQueues[ev.id] = buildPendingReviews(ev, today);
    consumedSubtopics[ev.id] = {};
    totalSubtopics[ev.id] = {};
    for (const topic of ev.topics) {
      if (topic.subtopics?.length > 0) {
        const pendingCount = topic.subtopics.filter((s) => !s.completed).length;
        if (pendingCount > 0) {
          totalSubtopics[ev.id][topic.id] = pendingCount;
        }
      }
    }
  }
  for (const ev of projects) {
    projectQueues[ev.id] = buildPendingItems(ev);
  }

  const allDates = dateRange(today, planEnd);
  const days = [];

  for (const date of allDates) {
    if (skipped.has(date)) {
      days.push({ date, sessions: [], total_minutes: 0, skipped: true });
      continue;
    }

    const isToday = date === today;
    const totalMinutes = (hoursPerDay + (isToday ? extraHoursToday : 0)) * 60;

    const sessions = buildDaySessions(
      evaluations,
      projects,
      pendingQueues,
      reviewQueues,
      projectQueues,
      consumedSubtopics,
      totalSubtopics,
      date,
      totalMinutes,
      today,
    );

    const total_minutes = sessions.reduce((s, x) => s + x.minutes, 0);
    days.push({ date, sessions, total_minutes });
  }

  return { days };
}
