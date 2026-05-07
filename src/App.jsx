import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, Link } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import Today from "./pages/Today";
import Evaluations from "./pages/Evaluations";
import CalendarPage from "./pages/CalendarPage";
import Stats from "./pages/Stats";
import EvaluationDetail from "./pages/EvaluationDetail";
import ResetDataButton from "./components/ResetDataButton";
import ExportImportData from "./components/ExportImportData";

function Shell({ children }) {
  const navItems = [
    {
      to: "/",
      label: "Hoy",
      icon: LayoutDashboard,
      end: true,
      testid: "nav-today",
    },
    {
      to: "/evaluaciones",
      label: "Evaluaciones",
      icon: BookOpen,
      testid: "nav-evaluations",
    },
    {
      to: "/calendario",
      label: "Calendario",
      icon: CalendarDays,
      testid: "nav-calendar",
    },
    {
      to: "/estadisticas",
      label: "Estadísticas",
      icon: BarChart3,
      testid: "nav-stats",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between gap-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            data-testid="logo-link"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-600 transition-colors">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-semibold text-lg tracking-tight text-gray-900">
                StudyPlan
              </div>
              <div className="text-[11px] text-gray-500 -mt-0.5">
                Planificador Inteligente
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {/* mobile nav */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`${item.testid}-mobile`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 sm:px-8 py-8 sm:py-12">
        {children}
      </main>

      <footer className="max-w-6xl mx-auto px-6 sm:px-8 py-10 text-center text-xs text-gray-400">
        <div>StudyPlan · Planifica con calma, estudia con intención</div>
        <div className="flex items-center justify-center flex-wrap gap-1 mt-2">
          <ExportImportData />
          <ResetDataButton />
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/evaluaciones" element={<Evaluations />} />
            <Route path="/evaluaciones/:id" element={<EvaluationDetail />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/estadisticas" element={<Stats />} />
          </Routes>
        </Shell>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
