import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import DailyReport from "./pages/DailyReport";
import PeriodicReport from "./pages/PeriodicReport";
import ReportView from "./pages/ReportView";
import Analytics from "./pages/Analytics";
import Employees from "./pages/admin/Employees";
import Departments from "./pages/admin/Departments";
import Projects from "./pages/admin/Projects";
import Organizations from "./pages/admin/Organizations";
import Notifications from "./pages/Notifications";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/daily" component={DailyReport} />
      <Route path="/periodic" component={PeriodicReport} />
      <Route path="/reports" component={ReportView} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/admin/employees" component={Employees} />
      <Route path="/admin/departments" component={Departments} />
      <Route path="/admin/projects" component={Projects} />
      <Route path="/admin/organizations" component={Organizations} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" />
          <AuthProvider>
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
