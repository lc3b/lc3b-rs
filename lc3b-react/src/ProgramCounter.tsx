// import React, { useState } from "react";

export interface ProgramCounterProps {
  programCounter: number;
}

function ProgramCounter(programCounter: ProgramCounterProps) {
  return (
    <div>
      <h2>Program Counter</h2>
      <p>{programCounter.programCounter}</p>
    </div>
  );
}

export default ProgramCounter;
