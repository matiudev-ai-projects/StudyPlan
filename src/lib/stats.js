import { daysBetween } from "./dateUtils";

export function computeStats(allEvaluations, today) {
  let totalItems = 0;
  let completedItems = 0;

  const evaluations = allEvaluations.map((ev) => {
    let evTotal = 0;
    let evDone = 0;

    for (const topic of ev.topics) {
      if (topic.subtopics?.length > 0) {
        for (const sub of topic.subtopics) {
          evTotal++;
          if (sub.completed) evDone++;
        }
      } else {
        evTotal++;
        if (topic.completed) evDone++;
      }
    }

    totalItems += evTotal;
    completedItems += evDone;

    const daysLeft =
      ev.type === "project"
        ? (ev.weeks_goal ?? 4) * 7
        : daysBetween(today, ev.exam_date ?? today);

    return {
      id: ev.id,
      name: ev.name,
      type: ev.type ?? "evaluation",
      exam_date: ev.exam_date ?? null,
      total: evTotal,
      completed: evDone,
      percent: evTotal ? Math.round((evDone / evTotal) * 100) : 0,
      days_left: Math.max(0, daysLeft),
    };
  });

  return {
    total_topics: totalItems,
    total_completed: completedItems,
    total_pending: totalItems - completedItems,
    overall_percent: totalItems
      ? Math.round((completedItems / totalItems) * 100)
      : 0,
    total: totalItems,
    completed: completedItems,
    percent: totalItems ? Math.round((completedItems / totalItems) * 100) : 0,
    evaluations,
    active_evaluations: evaluations.filter((e) => e.days_left > 0).length,
  };
}
