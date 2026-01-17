import Computer from "./Computer";
import { ThemeProvider } from "./ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <Computer />
    </ThemeProvider>
  );
}

export default App;
