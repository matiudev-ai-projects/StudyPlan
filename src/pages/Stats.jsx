import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Target, CircleCheck, ListChecks } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { getStats } from "../lib/api";
import { formatDate, daysBetween, todayISO } from "../lib/dateUtils";
import { Progress } from "@/components/ui/progress";
import EmptyState from "../components/EmptyState";

const COLORS = {
  done: "#10B981",
  pending: "#E5E7EB",
};

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await getStats());
    } catch {
      toast.error("No se pudieron cargar las estadísticas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />;
  }

  if (!stats || !stats.evaluations || stats.evaluations.length === 0) {
    return (
      <div className="space-y-8 sp-fade-in">
        <PageHeading />
        <EmptyState
          testid="stats-empty"
          title="Sin datos aún"
          description="Registra tus evaluaciones y completa temas para ver tu progreso aquí."
          ctaLabel="Ir a evaluaciones"
          ctaTo="/evaluaciones"
          imageUrl="https://static.prod-images.emergentagent.com/jobs/fb1c591f-dd71-4514-a699-36fc3bda4b43/images/c1f412cf1cbcf5e9471a95f2447740726553142c222932aa458b184735e0c3ee.png"
        />
      </div>
    );
  }

  const pieData = [
    { name: "Completados", value: stats.total_completed },
    { name: "Pendientes", value: stats.total_pending },
  ];

  const barData = stats.evaluations.map((e) => ({
    name: e.name.length > 14 ? e.name.slice(0, 14) + "…" : e.name,
    Completados: e.completed,
    Pendientes: e.total - e.completed,
  }));

  return (
    <div className="space-y-8 sp-fade-in">
      <PageHeading />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI
          testid="kpi-overall"
          label="Progreso global"
          value={`${stats.overall_percent}%`}
          icon={<Target className="w-4 h-4" />}
        />
        <KPI
          testid="kpi-done"
          label="Ítems completados"
          value={stats.total_completed}
          icon={<CircleCheck className="w-4 h-4" />}
        />
        <KPI
          testid="kpi-pending"
          label="Ítems pendientes"
          value={stats.total_pending}
          icon={<ListChecks className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="sp-card p-6" data-testid="chart-pie">
          <h3 className="font-heading text-base font-medium text-gray-900 mb-4">
            Completados vs Pendientes
          </h3>
          {stats.total_topics > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill={COLORS.done} />
                  <Cell fill={COLORS.pending} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-400 text-center py-12">Sin datos</div>
          )}
        </div>

        <div className="sp-card p-6" data-testid="chart-bar">
          <h3 className="font-heading text-base font-medium text-gray-900 mb-4">
            Por evaluación
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} stroke="#E5E7EB" />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} stroke="#E5E7EB" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Completados" stackId="a" fill={COLORS.done} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pendientes" stackId="a" fill={COLORS.pending} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sp-card p-6" data-testid="evals-progress-list">
        <h3 className="font-heading text-base font-medium text-gray-900 mb-4">
          Detalle por evaluación
        </h3>
        <div className="divide-y divide-gray-100">
          {stats.evaluations.map((e) => {
            const dleft = daysBetween(todayISO(), e.exam_date);
            return (
              <Link
                key={e.id}
                to={`/evaluaciones/${e.id}`}
                data-testid={`stats-eval-${e.id}`}
                className="py-4 flex items-center gap-4 hover:bg-gray-50 px-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{e.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatDate(e.exam_date)} ·{" "}
                    {dleft < 0
                      ? "Finalizada"
                      : dleft === 0
                      ? "Hoy es el examen"
                      : `En ${dleft} ${dleft === 1 ? "día" : "días"}`}
                  </div>
                  {/* Desglose subtemas vs temas */}
                  <div className="text-xs text-gray-400 mt-0.5">
                    {e.has_subtopics
                      ? `${e.completed_subtopics}/${e.total_subtopics} subtemas completados`
                      : `${e.completed}/${e.total} temas completados`}
                  </div>
                </div>
                <div className="w-40 shrink-0">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{e.completed}/{e.total}</span>
                    <span className="font-medium text-gray-700">{e.percent}%</span>
                  </div>
                  <Progress value={e.percent} className="h-1.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PageHeading() {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-emerald-600 font-medium">
        Panel
      </div>
      <h1 className="font-heading text-3xl sm:text-4xl font-medium text-gray-900 mt-1 flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-emerald-500" />
        Estadísticas
      </h1>
      <p className="text-gray-500 mt-1 text-sm">
        Tu progreso, temas completados y días restantes por evaluación.
      </p>
    </div>
  );
}

function KPI({ label, value, icon, testid }) {
  return (
    <div className="sp-card p-5" data-testid={testid}>
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider font-medium">
        <span className="text-emerald-500">{icon}</span>
        {label}
      </div>
      <div className="font-heading text-3xl font-medium text-gray-900 mt-2">{value}</div>
    </div>
  );
}