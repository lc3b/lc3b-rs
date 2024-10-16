import React from "react";

import "./App.css";

// import new_computer from "lc3b";

function Computer() {
  const [assembly, setAssembly] = React.useState("ADD R1, R1, 100; neato");

  return (
    <div className="Computer">
      <header className="Computer-header">LC-3b</header>
      <div className="Computer-content">
        <div className="Assembly">
          <textarea
            className="Computer-Assembly"
            defaultValue={assembly}
          ></textarea>
          <button onClick={() => setAssembly(assembly)}>Do something</button>
        </div>
      </div>
    </div>
  );
}

export default Computer;
