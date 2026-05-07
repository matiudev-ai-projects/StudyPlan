import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck2,
  Clock,
  Sparkle,
  CircleCheck,
  Ban,
  RefreshCcw,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  getToday,
  getStats,
  toggleTopic,
  toggleSubtopic,
  toggleReview,
  addSkippedDay,
  removeSkippedDay,
  listSkippedDays,
  getExtraHours,
  setExtraHours,
  getSettings,
  setSettings,
  getWarnings,
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
import { Progress } from "@/components/ui/progress";

export default function Today() {
  const [today, setToday] = useState(null);
  const [stats, setStats] = useState(null);
  const [skipped, setSkipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extraHours, setExtraHoursState] = useState(0);
  const [globalHours, setGlobalHoursState] = useState(2);
  const [warnings, setWarnings] = useState([]);
  const [editingHours, setEditingHours] = useState(false);
  const [hoursDraft, setHoursDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s, sk] = await Promise.all([
        getToday(),
        getStats(),
        listSkippedDays(),
      ]);
      setToday(t);
      setStats(s);
      setSkipped(sk.some((d) => d.date === todayISO()));
      const extra = getExtraHours(todayISO());
      setExtraHoursState(extra);
      const settings = getSettings();
      setGlobalHoursState(settings.hours_per_day);
      setWarnings(getWarnings());
    } catch (e) {
      toast.error("No se pudo cargar el plan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExtraHours = async (h) => {
    if (h === extraHours) return;
    setExtraHours(todayISO(), h);
    setExtraHoursState(h);
    await load();
  };

  const commitGlobalHours = async () => {
    const n = parseFloat(hoursDraft);
    if (!isNaN(n) && n >= 0.5 && n <= 24) {
      setSettings({ hours_per_day: n });
      setGlobalHoursState(n);
      await load();
    }
    setEditingHours(false);
  };

  const handleToggle = async (eid, tid, sid, rid) => {
    try {
      if (rid) {
        await toggleReview(eid, tid, rid);
      } else if (sid) {
        await toggleSubtopic(eid, tid, sid);
      } else {
        await toggleTopic(eid, tid);
      }
      toast.success("Estado actualizado");
      await load();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const handleSkipToday = async () => {
    try {
      if (skipped) {
        await removeSkippedDay(todayISO());
        toast.success("Día reactivado");
      } else {
        await addSkippedDay(todayISO());
        toast.success("Día marcado como no estudiado. Reprogramando…");
      }
      await load();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  if (loading) {
    return <LoadingGrid />;
  }

  const hasEvals = stats && stats.evaluations && stats.evaluations.length > 0;
  if (!hasEvals) {
    return (
      <div className="space-y-8 sp-fade-in">
        <PageHeading />
        <EmptyState
          testid="today-empty"
          imageUrl="https://static.prod-images.emergentagent.com/jobs/fb1c591f-dd71-4514-a699-36fc3bda4b43/images/2af176428b2489e472ee7c8211fab85766d335afcaa447f7a55dc863b3058a2c.png"
        />
      </div>
    );
  }

  const sessions = today?.sessions || [];
  const totalMin = today?.total_minutes || 0;
  const activeEvals = stats?.active_evaluations || 0;

  return (
    <div className="space-y-8 sp-fade-in">
      <PageHeading />

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          testid="stat-sessions"
          icon={<Sparkle className="w-4 h-4" />}
          label="Sesiones de hoy"
          value={sessions.length}
        />
        <StatTile
          testid="stat-minutes"
          icon={<Clock className="w-4 h-4" />}
          label="Tiempo total"
          value={formatMinutes(totalMin)}
        />
        <StatTile
          testid="stat-active"
          icon={<CalendarCheck2 className="w-4 h-4" />}
          label="Evaluaciones activas"
          value={activeEvals}
        />
      </div>

      {/* Warnings banner */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <div className="font-medium mb-1">
              {warnings.length === 1
                ? "Una evaluación no se puede cubrir con las horas actuales"
                : `${warnings.length} evaluaciones no se pueden cubrir con las horas actuales`}
            </div>
            <ul className="space-y-0.5 text-amber-800">
              {warnings.map((w) => (
                <li key={w.eval_id}>
                  · <span className="font-medium">{w.eval_name}</span>: necesitás ~{w.shortfall_hours}h más en total
                </li>
              ))}
            </ul>
            <div className="mt-1.5 text-xs text-amber-600">
              Aumentá las horas diarias o reducí los temas para cubrir el plan.
            </div>
          </div>
        </div>
      )}

      {/* Today sessions */}
      <section>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-gray-400 font-medium">
                {formatDayName(todayISO())} · {formatDate(todayISO())}
              </div>
              <h2 className="font-heading text-2xl font-medium text-gray-900 mt-0.5">
                Tu plan para hoy
              </h2>
            </div>
            <Button
              variant="ghost"
              onClick={handleSkipToday}
              data-testid="skip-today-btn"
              className={skipped ? "text-emerald-700 hover:bg-emerald-50" : "text-gray-600"}
            >
              {skipped ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-1.5" />
                  Reactivar día
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-1.5" />
                  No pude estudiar hoy
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-gray-600">
            {/* Global hours editor */}
            <div className="flex items-center gap-1.5">
              <span>Horas/día:</span>
              {editingHours ? (
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={hoursDraft}
                  onChange={(e) => setHoursDraft(e.target.value)}
                  onBlur={commitGlobalHours}
                  onKeyDown={(e) => e.key === "Enter" && commitGlobalHours()}
                  className="w-16 text-center border border-emerald-300 rounded-md px-1.5 py-0.5 text-sm font-medium text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => { setHoursDraft(String(globalHours)); setEditingHours(true); }}
                  className="flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {globalHours}h
                  <Pencil className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>

            <div className="w-px h-4 bg-gray-200 hidden sm:block" />

            {/* Extra hours */}
            <div className="flex items-center gap-2">
              <span>Extra hoy:</span>
              {[0, 0.5, 1, 2, 3].map((h) => (
                <button
                  key={h}
                  onClick={() => handleExtraHours(h)}
                  className={`px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
                    extraHours === h
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "border-gray-200 text-gray-600 hover:border-emerald-300"
                  }`}
                >
                  {h === 0 ? "ninguna" : `+${h}h`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {skipped ? (
          <div
            className="sp-card p-10 text-center"
            data-testid="skipped-today-card"
          >
            <Ban className="w-8 h-8 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium">
              Marcaste este día como no estudiado
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Las horas se redistribuyeron en los días siguientes.
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div
            className="sp-card p-10 text-center"
            data-testid="no-sessions-today"
          >
            <CircleCheck className="w-8 h-8 mx-auto text-emerald-500 mb-3" />
            <p className="text-gray-700 font-medium">
              Nada programado para hoy
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Descansa o adelanta un tema desde tus evaluaciones.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            data-testid="today-sessions"
          >
            {sessions.map((s, i) => (
              <SessionCard key={i} s={s} idx={i} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </section>

      {/* Active evaluations summary */}
      <section>
        <h3 className="font-heading text-lg font-medium text-gray-900 mb-3">
          Evaluaciones activas
        </h3>
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          data-testid="active-evals"
        >
          {stats.evaluations.map((e) => (
            <Link
              to={`/evaluaciones/${e.id}`}
              key={e.id}
              data-testid={`eval-card-${e.id}`}
              className="sp-card p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-heading text-base font-medium text-gray-900 truncate">
                    {e.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Examen · {formatDate(e.exam_date)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-heading font-medium text-emerald-600 leading-none">
                    {e.days_left < 0 ? "—" : e.days_left}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 mt-1">
                    {e.days_left === 1 ? "día" : "días"}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>
                    {e.completed}/{e.total} temas
                  </span>
                  <span className="font-medium text-gray-700">
                    {e.percent}%
                  </span>
                </div>
                <Progress value={e.percent} className="h-1.5" />
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700 group-hover:gap-2 transition-all">
                Ver detalle <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function PageHeading() {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-emerald-600 font-medium">
        Bienvenido
      </div>
      <h1 className="font-heading text-3xl sm:text-4xl font-medium text-gray-900 mt-1 tracking-tight">
        Hoy
      </h1>
      <p className="text-gray-500 mt-1 text-sm">
        Tu plan de estudio recalculado automáticamente según dificultad y días
        restantes.
      </p>
    </div>
  );
}

function StatTile({ icon, label, value, testid }) {
  return (
    <div className="sp-card p-5" data-testid={testid}>
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider font-medium">
        <span className="text-emerald-500">{icon}</span>
        {label}
      </div>
      <div className="font-heading text-2xl sm:text-3xl font-medium text-gray-900 mt-2">
        {value}
      </div>
    </div>
  );
}

function SessionCard({ s, idx, onToggle }) {
  return (
    <div
      className={`sp-card p-5 hover:border-emerald-300 hover:shadow-md transition-all ${s.completed ? "opacity-60" : ""}`}
      data-testid={`session-card-${idx}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Evaluación · Tema padre (si hay subtema) */}
          <div className="text-xs uppercase tracking-wider text-emerald-600 font-medium truncate">
            {s.eval_name}
            {s.subtopic_name && s.topic_name ? ` · ${s.topic_name}` : ""}
          </div>
          {/* Nombre de la sesión: subtema o tema */}
          <div
            className={`font-heading text-lg font-medium mt-0.5 truncate ${s.completed ? "line-through text-gray-400" : "text-gray-900"}`}
          >
            {s.subtopic_name || s.topic_name}
          </div>
          {/* Badge de repaso */}
          {s.is_review && (
            <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full mt-1">
              <RotateCcw className="w-3 h-3" /> Repaso {s.review_number}/3
            </span>
          )}
          {/* Badge de overflow (tema difícil que supera el límite diario) */}
          {s.is_overflow && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-1">
              <AlertTriangle className="w-3 h-3" /> Supera el tiempo recomendado
            </span>
          )}
        </div>
        <DifficultyBadge difficulty={s.difficulty} />
      </div>

      <div className="flex items-center gap-3 mt-4 text-sm">
        <div className="flex items-center gap-1.5 text-gray-700">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{formatMinutes(s.minutes)}</span>
        </div>
        <Button
          size="sm"
          variant={s.completed ? "ghost" : "outline"}
          onClick={() => onToggle(s.eval_id, s.topic_id, s.subtopic_id, s.review_id)}
          data-testid={`complete-session-${idx}`}
          className={`ml-auto ${
            s.completed
              ? "text-gray-400 hover:text-gray-600"
              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          }`}
        >
          <CircleCheck className="w-4 h-4 mr-1" />
          {s.completed ? "Completado" : "Marcar completado"}
        </Button>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-gray-100 rounded-lg w-1/3" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}