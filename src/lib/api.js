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

export const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------------- HELPERS ----------------

export function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const days = [];
  while (s <= e) {
    days.push(s.toISOString().slice(0, 10));
    s.setDate(s.getDate() + 1);
  }
  return days;
}

export function difficultyWeight(d) {
  if (d === "hard" || d === "dificil") return 3;
  if (d === "medium" || d === "media") return 2;
  return 1;
}

export function topicMinutes(difficulty) {
  if (difficulty === "hard" || difficulty === "dificil") return 90;
  if (difficulty === "medium" || difficulty === "media") return 60;
  return 30;
}

export function getInterval(difficulty, proximity) {
  const base =
    difficulty === "hard" || difficulty === "dificil"
      ? 2
      : difficulty === "medium" || difficulty === "media"
        ? 4
        : 6;
  return Math.max(1, Math.round(base * (1 - proximity * 0.5)));
}

// ---------------- DAILY SNAPSHOT ----------------

const SNAPSHOT_KEY = "studyplan_snapshot";

function getSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSnapshot(date, presentedIds) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ date, presentedIds }));
}

export function clearSnapshot() {
  localStorage.removeItem(SNAPSHOT_KEY);
}

function getTodaySnapshot() {
  const snap = getSnapshot();
  if (!snap) return null;
  if (snap.date !== todayISO()) return null;
  return snap.presentedIds;
}

// ---------------- SETTINGS ----------------

const SETTINGS_KEY = "studyplan_settings";

export const getSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { hours_per_day: 2 };
  } catch {
    return { hours_per_day: 2 };
  }
};

export const setSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  clearSnapshot();
};

// ---------------- EVALUATIONS ----------------

export const getEvaluation = async (id) => {
  const db = getDB();
  return db.evaluations.find((e) => e.id === id);
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
      subtopics: (t.subtopics || []).map((sub) => ({
        id: crypto.randomUUID(),
        name: typeof sub === "string" ? sub : sub.name,
        completed: false,
      })),
    })),
  };

  db.evaluations.push(newEval);
  saveDB(db);
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
  return db.evaluations[i];
};

export const deleteEvaluation = async (id) => {
  const db = getDB();
  db.evaluations = db.evaluations.filter((e) => e.id !== id);
  saveDB(db);
};

export const toggleTopic = async (eid, tid) => {
  const db = getDB();
  const ev = db.evaluations.find((e) => e.id === eid);
  if (!ev) return;

  const t = ev.topics.find((t) => t.id === tid);
  if (!t) return;

  t.completed = !t.completed;
  t.completed_at = t.completed ? new Date().toISOString() : null;

  if (t.subtopics?.length > 0) {
    t.subtopics.forEach((s) => {
      s.completed = t.completed;
    });
  }

  saveDB(db);
  return ev;
};

export const toggleSubtopic = async (eid, tid, sid) => {
  const db = getDB();
  const ev = db.evaluations.find((e) => e.id === eid);
  if (!ev) return;

  const topic = ev.topics.find((t) => t.id === tid);
  if (!topic) return;

  const sub = topic.subtopics.find((s) => s.id === sid);
  if (!sub) return;

  sub.completed = !sub.completed;

  const allDone = topic.subtopics.every((s) => s.completed);
  topic.completed = allDone;
  topic.completed_at = allDone ? new Date().toISOString() : null;

  saveDB(db);
  return ev;
};

// ---------------- SKIPPED DAYS ----------------

export const listSkippedDays = async () => {
  return getDB().skippedDays;
};

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
  return db.skippedDays;
};

// ---------------- PLAN LOGIC ----------------

export const getPlan = async (extraHoursOverride = 0) => {
  const db = getDB();
  const today = todayISO();
  const skippedDates = new Set(db.skippedDays.map((d) => d.date));
  const daysMap = {};
  const globalHoursPerDay = getSettings().hours_per_day;

  const todayPresentedIds = getTodaySnapshot();
  // IDs nuevos que se generan hoy (base o extra) para guardar en snapshot
  const newTodayPresentedIds = [];

  // ── PRE-PASS: asignar minutos por (fecha, evaluación) según urgencia ──
  const dayEvalUrgency = {};
  db.evaluations.forEach((ev) => {
    const isProject = ev.type === "project";
    let effectiveEndDate = ev.exam_date;
    if (isProject) {
      const end = new Date(today);
      end.setDate(end.getDate() + (ev.weeks_goal || 4) * 7);
      effectiveEndDate = end.toISOString().slice(0, 10);
    }
    if (!effectiveEndDate) return;
    const preAllDays = daysBetween(today, effectiveEndDate);
    const preActiveDays = preAllDays.filter((d) => !skippedDates.has(d));
    if (!preActiveDays.length || !ev.topics.length) return;
    const total = preActiveDays.length;
    preActiveDays.forEach((date, i) => {
      const urgency = 1 / Math.max(1, total - i);
      if (!dayEvalUrgency[date]) dayEvalUrgency[date] = [];
      dayEvalUrgency[date].push({ eval_id: ev.id, urgency });
    });
  });

  // Minutos pendientes totales por evaluación (para redistribuir excedentes)
  const evalPendingMins = {};
  db.evaluations.forEach((ev) => {
    let mins = 0;
    ev.topics.forEach((topic) => {
      if (topic.subtopics?.length > 0) {
        topic.subtopics.forEach((sub) => {
          if (!sub.completed) mins += topicMinutes(topic.difficulty);
        });
      } else {
        if (!topic.completed) mins += topicMinutes(topic.difficulty);
      }
    });
    evalPendingMins[ev.id] = mins;
  });

  const allocations = {};
  Object.entries(dayEvalUrgency).forEach(([date, evals]) => {
    const totalUrgency = evals.reduce((s, e) => s + e.urgency, 0);
    const totalMinutes =
      date === today
        ? (globalHoursPerDay + extraHoursOverride) * 60
        : globalHoursPerDay * 60;

    // Asignación base por urgencia
    const alloc = {};
    evals.forEach(({ eval_id, urgency }) => {
      alloc[eval_id] = Math.round((urgency / totalUrgency) * totalMinutes);
    });

    // Capear en los minutos pendientes y redistribuir excedente
    let excess = 0;
    evals.forEach(({ eval_id }) => {
      const pending = evalPendingMins[eval_id] || 0;
      if (alloc[eval_id] > pending) {
        excess += alloc[eval_id] - pending;
        alloc[eval_id] = pending;
      }
    });
    if (excess > 0) {
      const absorbable = evals.filter(
        ({ eval_id }) => (evalPendingMins[eval_id] || 0) > alloc[eval_id],
      );
      if (absorbable.length > 0) {
        const absorbUrgency = absorbable.reduce((s, e) => s + e.urgency, 0);
        absorbable.forEach(({ eval_id, urgency }) => {
          const extra = Math.round((urgency / absorbUrgency) * excess);
          const cap = (evalPendingMins[eval_id] || 0) - alloc[eval_id];
          alloc[eval_id] += Math.min(extra, cap);
        });
      }
    }

    allocations[date] = alloc;
  });

  db.evaluations.forEach((ev) => {
    const isProject = ev.type === "project";
    let effectiveEndDate = ev.exam_date;
    if (isProject) {
      const end = new Date(today);
      end.setDate(end.getDate() + (ev.weeks_goal || 4) * 7);
      effectiveEndDate = end.toISOString().slice(0, 10);
    }
    if (!effectiveEndDate) return;

    const allDays = daysBetween(today, effectiveEndDate);
    if (!allDays.length) return;

    const activeDays = allDays.filter((d) => !skippedDates.has(d));
    if (!activeDays.length) return;

    const rawTopics = ev.topics;
    if (!rawTopics.length) return;

    const allItems = [];
    rawTopics.forEach((topic) => {
      if (topic.subtopics && topic.subtopics.length > 0) {
        topic.subtopics.forEach((sub) => {
          allItems.push({
            id: sub.id,
            name: sub.name,
            parentId: topic.id,
            parentName: topic.name,
            difficulty: topic.difficulty,
            completed: sub.completed,
          });
        });
      } else {
        allItems.push({
          id: topic.id,
          name: topic.name,
          parentId: null,
          parentName: null,
          difficulty: topic.difficulty,
          completed: topic.completed,
        });
      }
    });

    // IDs ya en el snapshot de hoy (set para lookup rápido)
    const presentedTodaySet = new Set(todayPresentedIds || []);

    // Ítems del snapshot (en orden original de allItems para respetar secuencia)
    const presentedToday = todayPresentedIds
      ? allItems.filter((i) => presentedTodaySet.has(i.id))
      : [];

    // Ítems pendientes: ni completados ni ya en el snapshot
    const pending = allItems.filter(
      (i) => !i.completed && !presentedTodaySet.has(i.id),
    );

    const repasoTopics = [];
    const repasoPendiente = {};
    rawTopics.forEach((topic, topicIndex) => {
      const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
      const isComplete = hasSubtopics
        ? topic.subtopics.every((s) => s.completed)
        : topic.completed;

      if (isComplete) {
        repasoTopics.push({
          id: topic.id,
          name: topic.name,
          difficulty: topic.difficulty,
          minutes: hasSubtopics
            ? Math.min(90, topic.subtopics.length * 10)
            : topicMinutes(topic.difficulty),
        });
        repasoPendiente[topic.id] = topicIndex;
      }
    });

    let firstPassIndex = 0;
    const totalActiveDays = activeDays.length;

    activeDays.forEach((date, dayIndex) => {
      if (!daysMap[date]) {
        daysMap[date] = { date, sessions: [], total_minutes: 0 };
      }

      const isToday = date === today;
      const proximity = isProject
        ? 0
        : totalActiveDays === 1 ? 1 : dayIndex / (totalActiveDays - 1);

      let minutesLeft = allocations[date]?.[ev.id] || 0;

      if (isToday) {
        if (todayPresentedIds) {
          // ── CASO A: Ya existe snapshot ──
          // 1) Mostrar los temas del snapshot (congelados, respetando estado completado actual)
          for (const item of presentedToday) {
            const minutes = topicMinutes(item.difficulty);
            daysMap[date].sessions.push({
              eval_id: ev.id,
              eval_name: ev.name,
              topic_id: item.parentId || item.id,
              subtopic_id: item.parentId ? item.id : null,
              topic_name: item.parentId ? item.parentName : item.name,
              subtopic_name: item.parentId ? item.name : null,
              difficulty: item.difficulty,
              minutes,
              completed: item.completed,
              isRepaso: false,
            });
            daysMap[date].total_minutes += minutes;
            minutesLeft -= minutes;
          }

          // 2) Si quedan minutos (por horas extra), agregar temas nuevos de "pending"
          //    y actualizar el snapshot para persistirlos
          while (minutesLeft > 0 && firstPassIndex < pending.length) {
            const item = pending[firstPassIndex];
            const minutes = topicMinutes(item.difficulty);
            if (minutesLeft - minutes < 0) break;

            daysMap[date].sessions.push({
              eval_id: ev.id,
              eval_name: ev.name,
              topic_id: item.parentId || item.id,
              subtopic_id: item.parentId ? item.id : null,
              topic_name: item.parentId ? item.parentName : item.name,
              subtopic_name: item.parentId ? item.name : null,
              difficulty: item.difficulty,
              minutes,
              completed: item.completed,
              isRepaso: false,
            });

            daysMap[date].total_minutes += minutes;
            minutesLeft -= minutes;
            newTodayPresentedIds.push(item.id);
            firstPassIndex++;
          }

          // 3) Si aún sobran minutos, agregar repasos extra
          if (minutesLeft > 0 && repasoTopics.length > 0) {
            const repasoHoy = repasoTopics
              .filter((t) => (repasoPendiente[t.id] ?? 0) <= dayIndex)
              .sort((a, b) => {
                const oA = dayIndex - (repasoPendiente[a.id] ?? 0);
                const oB = dayIndex - (repasoPendiente[b.id] ?? 0);
                if (oB !== oA) return oB - oA;
                return (
                  difficultyWeight(b.difficulty) -
                  difficultyWeight(a.difficulty)
                );
              });

            for (const topic of repasoHoy) {
              if (minutesLeft - topic.minutes < 0) continue;
              daysMap[date].sessions.push({
                eval_id: ev.id,
                eval_name: ev.name,
                topic_id: topic.id,
                subtopic_id: null,
                topic_name: topic.name,
                subtopic_name: null,
                difficulty: topic.difficulty,
                minutes: topic.minutes,
                completed: false,
                isRepaso: true,
              });
              daysMap[date].total_minutes += topic.minutes;
              minutesLeft -= topic.minutes;
              newTodayPresentedIds.push(topic.id);
              const interval = getInterval(topic.difficulty, proximity);
              repasoPendiente[topic.id] = dayIndex + interval;
            }
          }
        } else {
          // ── CASO B: Sin snapshot — generar plan base de hoy ──
          while (minutesLeft > 0 && firstPassIndex < pending.length) {
            const item = pending[firstPassIndex];
            const minutes = topicMinutes(item.difficulty);
            if (minutesLeft - minutes < 0) break;

            daysMap[date].sessions.push({
              eval_id: ev.id,
              eval_name: ev.name,
              topic_id: item.parentId || item.id,
              subtopic_id: item.parentId ? item.id : null,
              topic_name: item.parentId ? item.parentName : item.name,
              subtopic_name: item.parentId ? item.name : null,
              difficulty: item.difficulty,
              minutes,
              completed: item.completed,
              isRepaso: false,
            });

            daysMap[date].total_minutes += minutes;
            minutesLeft -= minutes;
            newTodayPresentedIds.push(item.id);
            firstPassIndex++;
          }

          if (minutesLeft > 0 && repasoTopics.length > 0) {
            const repasoHoy = repasoTopics
              .filter((t) => (repasoPendiente[t.id] ?? 0) <= dayIndex)
              .sort((a, b) => {
                const oA = dayIndex - (repasoPendiente[a.id] ?? 0);
                const oB = dayIndex - (repasoPendiente[b.id] ?? 0);
                if (oB !== oA) return oB - oA;
                return (
                  difficultyWeight(b.difficulty) -
                  difficultyWeight(a.difficulty)
                );
              });

            for (const topic of repasoHoy) {
              if (minutesLeft - topic.minutes < 0) continue;
              daysMap[date].sessions.push({
                eval_id: ev.id,
                eval_name: ev.name,
                topic_id: topic.id,
                subtopic_id: null,
                topic_name: topic.name,
                subtopic_name: null,
                difficulty: topic.difficulty,
                minutes: topic.minutes,
                completed: false,
                isRepaso: true,
              });
              daysMap[date].total_minutes += topic.minutes;
              minutesLeft -= topic.minutes;
              newTodayPresentedIds.push(topic.id);
              const interval = getInterval(topic.difficulty, proximity);
              repasoPendiente[topic.id] = dayIndex + interval;
            }
          }
        }
      } else {
        // ── Días futuros ──
        if (dayIndex === 1) {
          const overdueFromToday = presentedToday.filter((i) => !i.completed);
          for (const item of overdueFromToday) {
            const minutes = topicMinutes(item.difficulty);
            if (minutesLeft - minutes < 0) continue;
            daysMap[date].sessions.push({
              eval_id: ev.id,
              eval_name: ev.name,
              topic_id: item.parentId || item.id,
              subtopic_id: item.parentId ? item.id : null,
              topic_name: item.parentId ? item.parentName : item.name,
              subtopic_name: item.parentId ? item.name : null,
              difficulty: item.difficulty,
              minutes,
              completed: false,
              isRepaso: false,
            });
            daysMap[date].total_minutes += minutes;
            minutesLeft -= minutes;
          }
        }

        while (minutesLeft > 0 && firstPassIndex < pending.length) {
          const item = pending[firstPassIndex];
          const minutes = topicMinutes(item.difficulty);
          if (minutesLeft - minutes < 0) break;
          daysMap[date].sessions.push({
            eval_id: ev.id,
            eval_name: ev.name,
            topic_id: item.parentId || item.id,
            subtopic_id: item.parentId ? item.id : null,
            topic_name: item.parentId ? item.parentName : item.name,
            subtopic_name: item.parentId ? item.name : null,
            difficulty: item.difficulty,
            minutes,
            completed: false,
            isRepaso: false,
          });
          daysMap[date].total_minutes += minutes;
          minutesLeft -= minutes;
          firstPassIndex++;
        }

        if (minutesLeft > 0 && repasoTopics.length > 0) {
          const repasoHoy = repasoTopics
            .filter((t) => (repasoPendiente[t.id] ?? 0) <= dayIndex)
            .sort((a, b) => {
              const oA = dayIndex - (repasoPendiente[a.id] ?? 0);
              const oB = dayIndex - (repasoPendiente[b.id] ?? 0);
              if (oB !== oA) return oB - oA;
              return (
                difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty)
              );
            });

          for (const topic of repasoHoy) {
            if (minutesLeft - topic.minutes < 0) continue;
            daysMap[date].sessions.push({
              eval_id: ev.id,
              eval_name: ev.name,
              topic_id: topic.id,
              subtopic_id: null,
              topic_name: topic.name,
              subtopic_name: null,
              difficulty: topic.difficulty,
              minutes: topic.minutes,
              completed: false,
              isRepaso: true,
            });
            daysMap[date].total_minutes += topic.minutes;
            minutesLeft -= topic.minutes;
            const interval = getInterval(topic.difficulty, proximity);
            repasoPendiente[topic.id] = dayIndex + interval;
          }
        }
      }
    });

    allDays.forEach((date) => {
      if (skippedDates.has(date)) {
        if (!daysMap[date]) {
          daysMap[date] = {
            date,
            sessions: [],
            total_minutes: 0,
            skipped: true,
          };
        } else {
          daysMap[date].skipped = true;
        }
      }
    });
  });

  // Guardar/actualizar snapshot:
  // - Si no había snapshot: guardar todos los IDs generados hoy (Caso B)
  // - Si ya había snapshot: extenderlo con los IDs nuevos que se agregaron (Caso A con horas extra)
  if (newTodayPresentedIds.length > 0) {
    const baseIds = todayPresentedIds || [];
    // Evitar duplicados al extender
    const merged = [
      ...baseIds,
      ...newTodayPresentedIds.filter((id) => !baseIds.includes(id)),
    ];
    saveSnapshot(today, merged);
  }

  return {
    days: Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date)),
  };
};

// ---------------- TODAY ----------------

export const getToday = async () => {
  const today = todayISO();
  const extraHours = getExtraHours(today);

  const plan = await getPlan(extraHours);
  return (
    plan.days.find((d) => d.date === today) || {
      date: today,
      sessions: [],
      total_minutes: 0,
    }
  );
};

// ---------------- STATS ----------------

export const getStats = async () => {
  const db = getDB();
  const today = todayISO();

  let totalItems = 0;
  let completedItems = 0;

  const evaluations = db.evaluations.map((ev) => {
    let evTotal = 0;
    let evDone = 0;
    let totalSubtopics = 0;
    let completedSubtopics = 0;
    let hasSubtopics = false;

    ev.topics.forEach((t) => {
      if (t.subtopics && t.subtopics.length > 0) {
        hasSubtopics = true;
        t.subtopics.forEach((s) => {
          evTotal++;
          totalSubtopics++;
          if (s.completed) {
            evDone++;
            completedSubtopics++;
          }
        });
      } else {
        evTotal++;
        if (t.completed) evDone++;
      }
    });

    totalItems += evTotal;
    completedItems += evDone;

    const daysLeft = ev.type === "project"
      ? (ev.weeks_goal || 4) * 7
      : daysBetween(today, ev.exam_date).length - 1;

    return {
      id: ev.id,
      name: ev.name,
      exam_date: ev.exam_date,
      total: evTotal,
      completed: evDone,
      percent: evTotal ? Math.round((evDone / evTotal) * 100) : 0,
      days_left: daysLeft,
      has_subtopics: hasSubtopics,
      total_subtopics: totalSubtopics,
      completed_subtopics: completedSubtopics,
    };
  });

  const totalPending = totalItems - completedItems;

  return {
    total_topics: totalItems,
    total_completed: completedItems,
    total_pending: totalPending,
    overall_percent: totalItems
      ? Math.round((completedItems / totalItems) * 100)
      : 0,
    total: totalItems,
    completed: completedItems,
    percent: totalItems ? Math.round((completedItems / totalItems) * 100) : 0,
    evaluations,
    active_evaluations: evaluations.filter((e) => e.days_left >= 0).length,
  };
};

// ---------------- WARNINGS ----------------

export const getWarnings = () => {
  const db = getDB();
  const today = todayISO();
  const skippedDates = new Set(db.skippedDays.map((d) => d.date));
  const globalMinutesPerDay = getSettings().hours_per_day * 60;

  const dayEvalUrgency = {};
  db.evaluations.forEach((ev) => {
    const isProject = ev.type === "project";
    let effectiveEndDate = ev.exam_date;
    if (isProject) {
      const end = new Date(today);
      end.setDate(end.getDate() + (ev.weeks_goal || 4) * 7);
      effectiveEndDate = end.toISOString().slice(0, 10);
    }
    if (!effectiveEndDate || effectiveEndDate < today) return;
    const allDays = daysBetween(today, effectiveEndDate);
    const activeDays = allDays.filter((d) => !skippedDates.has(d));
    if (!activeDays.length || !ev.topics.length) return;
    const total = activeDays.length;
    activeDays.forEach((date, i) => {
      const urgency = 1 / Math.max(1, total - i);
      if (!dayEvalUrgency[date]) dayEvalUrgency[date] = [];
      dayEvalUrgency[date].push({ eval_id: ev.id, urgency });
    });
  });

  const evalAllocated = {};
  Object.entries(dayEvalUrgency).forEach(([, evals]) => {
    const totalUrgency = evals.reduce((s, e) => s + e.urgency, 0);
    evals.forEach(({ eval_id, urgency }) => {
      const mins = Math.round((urgency / totalUrgency) * globalMinutesPerDay);
      evalAllocated[eval_id] = (evalAllocated[eval_id] || 0) + mins;
    });
  });

  const warnings = [];
  db.evaluations.forEach((ev) => {
    const isProject = ev.type === "project";
    let effectiveEndDate = ev.exam_date;
    if (isProject) {
      const end = new Date(today);
      end.setDate(end.getDate() + (ev.weeks_goal || 4) * 7);
      effectiveEndDate = end.toISOString().slice(0, 10);
    }
    if (!effectiveEndDate || effectiveEndDate < today) return;

    let pendingMinutes = 0;
    ev.topics.forEach((topic) => {
      if (topic.subtopics?.length > 0) {
        topic.subtopics.forEach((sub) => {
          if (!sub.completed) pendingMinutes += topicMinutes(topic.difficulty);
        });
      } else {
        if (!topic.completed) pendingMinutes += topicMinutes(topic.difficulty);
      }
    });
    if (pendingMinutes === 0) return;

    const allocated = evalAllocated[ev.id] || 0;
    if (pendingMinutes > allocated) {
      warnings.push({
        eval_id: ev.id,
        eval_name: ev.name,
        pending_minutes: pendingMinutes,
        allocated_minutes: allocated,
        shortfall_hours: Math.ceil((pendingMinutes - allocated) / 60),
      });
    }
  });

  return warnings;
};

// ---------------- EXPORT / IMPORT ----------------

export const exportData = () => {
  const raw = localStorage.getItem(DB_KEY);
  const studyplanData = raw ? JSON.parse(raw) : { evaluations: [], skippedDays: [] };

  const extraHours = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("extra_hours_")) {
      extraHours[key] = localStorage.getItem(key);
    }
  }

  return {
    version: 1,
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
    if (key && key.startsWith("extra_hours_")) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  if (data.extra_hours) {
    Object.entries(data.extra_hours).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }

  if (data.settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
  }
  clearSnapshot();
};

// ---------------- EXTRA HOURS ----------------

export const getExtraHours = (date) => {
  const key = `extra_hours_${date}`;
  return parseFloat(localStorage.getItem(key) || "0");
};

export const setExtraHours = (date, hours) => {
  const key = `extra_hours_${date}`;
  localStorage.setItem(key, String(hours));
};