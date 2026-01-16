// import React, { useState } from "react";

function RegisterSet(registers: RegisterSetProps) {
  return (
    <div>
      <h2>Registers</h2>
      <Register name="R0" value={registers.registers.r0} />
      <Register name="R1" value={registers.registers.r1} />
      <Register name="R2" value={registers.registers.r2} />
      <Register name="R3" value={registers.registers.r3} />
      <Register name="R4" value={registers.registers.r4} />
      <Register name="R5" value={registers.registers.r5} />
      <Register name="R6" value={registers.registers.r6} />
      <Register name="R7" value={registers.registers.r7} />
    </div>
  );
}

export interface RegisterSetProps {
  registers: {
    r0: number;
    r1: number;
    r2: number;
    r3: number;
    r4: number;
    r5: number;
    r6: number;
    r7: number;
  };
}

// Individual Register Component
function Register(props: any) {
  return (
    <p>
      {props.name}: {props.value}
    </p>
  );
}

export default RegisterSet;
