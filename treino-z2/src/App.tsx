import { Dashboard } from "./features/dashboard/Dashboard";

function App() {
  return (
    <div className="wrap">
      <header className="top">
        <div className="eyebrow">Treino Z2</div>
        <h1>Athlete Dashboard</h1>
      </header>
      <Dashboard />
    </div>
  );
}

export default App;
