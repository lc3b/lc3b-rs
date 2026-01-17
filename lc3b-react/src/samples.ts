export interface SampleProgram {
  title: string;
  description: string;
  code: string;
}

export const samplePrograms: SampleProgram[] = [
  {
    title: "Simple Addition",
    description: "Demonstrates ADD instruction with registers and immediates",
    code: `; Simple Addition Example
; Adds values in R1 and R2, stores result in R0

ADD R1, R1, #5   ; R1 = 5
ADD R2, R2, #3   ; R2 = 3
ADD R0, R1, R2   ; R0 = R1 + R2 = 8`,
  },
  {
    title: "AND and NOT Operations",
    description: "Demonstrates logical AND and NOT instructions",
    code: `; AND and NOT Example
; Demonstrates logical operations

ADD R1, R1, #15  ; R1 = 15 (0x000F)
ADD R2, R2, #7   ; R2 = 7  (0x0007)
AND R0, R1, R2   ; R0 = R1 AND R2 = 7
NOT R3, R0       ; R3 = NOT R0`,
  },
  {
    title: "Conditional Branching",
    description: "Demonstrates BR instruction with labels",
    code: `; Conditional Branching Example
; Counts down from 3 to 0 using BR with labels

ADD R0, R0, #3   ; R0 = 3 (counter)
ADD R1, R1, #0   ; R1 = 0 (sum)
loop:
    ADD R1, R1, R0   ; sum += counter
    ADD R0, R0, #-1  ; counter--
    BRp loop         ; if positive, branch back to loop
; R1 now contains 3+2+1 = 6`,
  },
];
