import { daysBetween, dateRange } from "./dateUtils";
import {
  totalPendingMinutes,
  totalPendingReviewMinutes,
  REVIEW_INTERVALS,
  reviewMinutes,
  topicMinutes,
} from "./studyUtils";

/**
 * Estima los minutos de repasos futuros para los temas aún no estudiados.
 * Cada tema genera 3 repasos al completarse.
 */
function estimateFutureReviewMinutes(evaluation) {
  let mins = 0;
  for (const topic of evaluation.topics) {
    if (topic.subtopics?.length > 0) {
      // Cada subtema completado dispara repasos del tema padre (al terminar todos)
      // Simplificación: contar cuántos temas padre tienen subtemas pendientes
      const allDone = topic.subtopics.every((s) => s.completed);
      if (!allDone) {
        // Este tema padre aún no generó todos sus repasos
        const completedReviews = topic.reviews?.filter((r) => r.completed).length ?? 0;
        const pendingReviews = REVIEW_INTERVALS.length - completedReviews;
        if (pendingReviews > 0) mins += pendingReviews * reviewMinutes(topic.difficulty);
      }
    } else {
      if (!topic.completed) {
        mins += REVIEW_INTERVALS.length * reviewMinutes(topic.difficulty);
      }
    }
  }
  return mins;
}

export function computeWarnings(allEvaluations, settings, today, skippedDays = []) {
  const hoursPerDay = settings.hours_per_day ?? 2;
  const skipped = new Set(skippedDays);
  const warnings = [];

  const evaluations = allEvaluations.filter(
    (ev) => ev.type !== "project" && ev.exam_date && ev.exam_date >= today,
  );

  for (const ev of evaluations) {
    const activeDays = dateRange(today, ev.exam_date).filter(
      (d) => !skipped.has(d),
    ).length;
    if (activeDays === 0) continue;

    const totalAvailable = activeDays * hoursPerDay * 60;

    const pendingTopicMins = totalPendingMinutes(ev);
    const pendingReviewMins = totalPendingReviewMinutes(ev);
    const futureReviewMins = estimateFutureReviewMinutes(ev);
    const totalNeeded = pendingTopicMins + pendingReviewMins + futureReviewMins;

    if (totalNeeded > totalAvailable) {
      warnings.push({
        eval_id: ev.id,
        eval_name: ev.name,
        needed_minutes: Math.round(totalNeeded),
        available_minutes: totalAvailable,
        shortfall_hours: Math.ceil((totalNeeded - totalAvailable) / 60),
        days_left: activeDays,
      });
    }
  }

  return warnings;
}
