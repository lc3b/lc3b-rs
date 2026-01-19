import Computer from "./Computer";
import { ThemeProvider } from "./ThemeContext";
import { AgentProvider } from "./AgentContext";

function App() {
  return (
    <ThemeProvider>
      <AgentProvider>
        <Computer />
      </AgentProvider>
    </ThemeProvider>
  );
}

export default App;