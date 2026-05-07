// Minutos de estudio por dificultad
export const DIFFICULTY_MINUTES = { facil: 30, media: 60, dificil: 90 };

// Minutos de repaso por dificultad (más corto que el estudio inicial)
export const REVIEW_MINUTES = { facil: 15, media: 30, dificil: 45 };

// Días acumulados desde la completación para cada repaso (1, 4, 11)
export const REVIEW_INTERVALS = [1, 4, 11];

export function topicMinutes(difficulty) {
  return DIFFICULTY_MINUTES[difficulty] ?? 60;
}

export function reviewMinutes(difficulty) {
  return REVIEW_MINUTES[difficulty] ?? 30;
}

export function difficultyWeight(difficulty) {
  if (difficulty === "dificil") return 3;
  if (difficulty === "media") return 2;
  return 1;
}

/**
 * Devuelve todos los ítems pendientes de una evaluación en orden definido.
 * Si el tema tiene subtemas, devuelve un ítem por subtema.
 * Si no tiene subtemas, devuelve el tema directamente.
 */
export function buildPendingItems(evaluation) {
  const items = [];
  for (const topic of evaluation.topics) {
    if (topic.subtopics && topic.subtopics.length > 0) {
      for (const sub of topic.subtopics) {
        if (!sub.completed) {
          items.push({
            id: sub.id,
            name: sub.name,
            parentId: topic.id,
            parentName: topic.name,
            difficulty: topic.difficulty,
          });
        }
      }
    } else {
      if (!topic.completed) {
        items.push({
          id: topic.id,
          name: topic.name,
          parentId: null,
          parentName: null,
          difficulty: topic.difficulty,
        });
      }
    }
  }
  return items;
}

/**
 * Devuelve los repasos pendientes de una evaluación ordenados por prioridad.
 * Prioridad: más atrasados primero → más difíciles primero.
 */
export function buildPendingReviews(evaluation, today) {
  const reviews = [];
  for (const topic of evaluation.topics) {
    if (!topic.completed || !topic.reviews?.length) continue;
    for (const review of topic.reviews) {
      if (review.completed) continue;
      const overdueDays = daysBetweenSimple(review.scheduled_for, today);
      reviews.push({
        id: review.id,
        review_number: review.review_number,
        scheduled_for: review.scheduled_for,
        topic_id: topic.id,
        topic_name: topic.name,
        difficulty: topic.difficulty,
        minutes: reviewMinutes(topic.difficulty),
        overdue_days: overdueDays,
      });
    }
  }
  reviews.sort((a, b) => {
    if (b.overdue_days !== a.overdue_days) return b.overdue_days - a.overdue_days;
    return difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty);
  });
  return reviews;
}

function daysBetweenSimple(a, b) {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / 86400000);
}

export function totalPendingMinutes(evaluation) {
  let mins = 0;
  for (const topic of evaluation.topics) {
    if (topic.subtopics?.length > 0) {
      for (const sub of topic.subtopics) {
        if (!sub.completed) mins += topicMinutes(topic.difficulty);
      }
    } else {
      if (!topic.completed) mins += topicMinutes(topic.difficulty);
    }
  }
  return mins;
}

export function totalPendingReviewMinutes(evaluation) {
  let mins = 0;
  for (const topic of evaluation.topics) {
    if (!topic.reviews?.length) continue;
    for (const review of topic.reviews) {
      if (!review.completed) mins += reviewMinutes(topic.difficulty);
    }
  }
  return mins;
}

export function minTopicMinutes(evaluation) {
  let min = Infinity;
  for (const topic of evaluation.topics) {
    const mins = topicMinutes(topic.difficulty);
    if (topic.subtopics?.length > 0) {
      if (topic.subtopics.some((s) => !s.completed)) min = Math.min(min, mins);
    } else {
      if (!topic.completed) min = Math.min(min, mins);
    }
  }
  return min === Infinity ? 30 : min;
}

export function avgDifficultyWeight(evaluation) {
  let total = 0;
  let count = 0;
  for (const topic of evaluation.topics) {
    const w = difficultyWeight(topic.difficulty);
    if (topic.subtopics?.length > 0) {
      const pending = topic.subtopics.filter((s) => !s.completed).length;
      total += w * pending;
      count += pending;
    } else {
      if (!topic.completed) { total += w; count++; }
    }
  }
  return count > 0 ? total / count : 1;
}
