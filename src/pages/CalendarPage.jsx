import { useEffect, useState, useCallback, useMemo } from "react";
import { CalendarDays, Ban, RefreshCcw, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  listSkippedDays,
  addSkippedDay,
  removeSkippedDay,
  getPlan
} from "../lib/api";
import {
  formatDate,
  formatDayName,
  formatMinutes,
  todayISO,
} from "../lib/dateUtils";
import DifficultyBadge from "../components/DifficultyBadge";
import EmptyState from "../components/EmptyState";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const [plan, setPlan] = useState(null);
  const [skipped, setSkipped] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, sk] = await Promise.all([getPlan(), listSkippedDays()]);
      setPlan(p);
      setSkipped(new Set(sk.map((d) => d.date)));
    } catch {
      toast.error("No se pudo cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSkip = async (date) => {
    try {
      if (skipped.has(date)) {
        await removeSkippedDay(date);
        toast.success("Día reactivado");
      } else {
        await addSkippedDay(date);
        toast.success("Día marcado como no estudiado");
      }
      await load();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-100 rounded w-1/3" />
        <div className="h-96 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!plan || !plan.days || plan.days.length === 0) {
    return (
      <div className="space-y-8 sp-fade-in">
        <PageHeading />
        <EmptyState
          testid="calendar-empty"
          title="Aún no hay plan de estudio"
          description="Crea una evaluación para ver tu calendario día por día hasta el examen."
          ctaLabel="Crear evaluación"
          ctaTo="/evaluaciones"
          imageUrl="https://static.prod-images.emergentagent.com/jobs/fb1c591f-dd71-4514-a699-36fc3bda4b43/images/2af176428b2489e472ee7c8211fab85766d335afcaa447f7a55dc863b3058a2c.png"
        />
      </div>
    );
  }

  const today = todayISO();

  return (
    <div className="space-y-8 sp-fade-in">
      <PageHeading />

      <div className="space-y-3" data-testid="calendar-days">
        {plan.days.map((d) => {
          const isToday = d.date === today;
          const isSkipped = skipped.has(d.date) || d.skipped;
          return (
            <div
              key={d.date}
              data-testid={`day-${d.date}`}
              className={`sp-card overflow-hidden ${
                isToday ? "border-emerald-300 ring-1 ring-emerald-100" : ""
              } ${isSkipped ? "bg-gray-50" : ""}`}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-medium text-gray-400">
                      {formatDayName(d.date)}
                    </span>
                    {isToday && (
                      <span className="sp-pill bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Hoy
                      </span>
                    )}
                    {isSkipped && (
                      <span className="sp-pill bg-gray-200 text-gray-700">
                        Reprogramado
                      </span>
                    )}
                  </div>
                  <div className="font-heading text-base font-medium text-gray-900 mt-0.5">
                    {formatDate(d.date)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isSkipped && d.total_minutes > 0 && (
                    <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatMinutes(d.total_minutes)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSkip(d.date)}
                    data-testid={`toggle-skip-${d.date}`}
                    className={
                      isSkipped
                        ? "text-emerald-700"
                        : "text-gray-500 hover:text-gray-800"
                    }
                  >
                    {isSkipped ? (
                      <>
                        <RefreshCcw className="w-4 h-4 mr-1" /> Reactivar
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4 mr-1" /> No estudiar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isSkipped ? (
                <div className="px-5 py-4 text-sm text-gray-500 italic">
                  Día sin estudio — las horas se han redistribuido.
                </div>
              ) : d.sessions.length === 0 ? (
                <div className="px-5 py-4 text-sm text-gray-400 italic">
                  Sin sesiones programadas.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(() => {
                    // Construir grupos: { evalName, topicName, subtopics: [] }
                    const groups = [];
                    d.sessions.forEach((s) => {
                      const key = `${s.eval_id}-${s.topic_id}`;
                      let group = groups.find((g) => g.key === key);
                      if (!group) {
                        group = {
                          key,
                          eval_name: s.eval_name,
                          topic_name: s.topic_name,
                          difficulty: s.difficulty,
                          subtopics: [],
                          minutes: 0,
                        };
                        groups.push(group);
                      }
                      if (s.subtopic_name) {
                        group.subtopics.push({
                          name: s.subtopic_name,
                          minutes: s.minutes,
                          completed: s.completed,
                        });
                      } else {
                        group.minutes += s.minutes;
                      }
                      if (s.subtopic_name) group.minutes += s.minutes;
                    });

                    return groups.map((g, i) => (
                      <div
                        key={i}
                        className="px-5 py-3 border-b border-gray-100 last:border-0"
                      >
                        {/* Cabecera del grupo */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-wider text-emerald-600 font-medium">
                              {g.eval_name}
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {g.topic_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <DifficultyBadge difficulty={g.difficulty} />
                            <span className="text-xs text-gray-500 tabular-nums">
                              {formatMinutes(g.minutes)}
                            </span>
                          </div>
                        </div>

                        {/* Subtemas listados debajo */}
                        {g.subtopics.length > 0 && (
                          <div className="mt-2 ml-3 space-y-1">
                            {g.subtopics.map((sub, j) => (
                              <div
                                key={j}
                                className={`flex items-center gap-2 text-xs ${sub.completed ? "text-gray-400 line-through" : "text-gray-500"}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                                {sub.name}
                                <span className="ml-auto tabular-nums text-gray-400">
                                  {formatMinutes(sub.minutes)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageHeading() {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-emerald-600 font-medium">
        Vista completa
      </div>
      <h1 className="font-heading text-3xl sm:text-4xl font-medium text-gray-900 mt-1 flex items-center gap-3">
        <CalendarDays className="w-8 h-8 text-emerald-500" />
        Calendario
      </h1>
      <p className="text-gray-500 mt-1 text-sm">
        Plan día por día desde hoy hasta tu última evaluación.
      </p>
    </div>
  );
}
