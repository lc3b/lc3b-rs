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
  {
    title: "JSR Subroutine Call",
    description: "Demonstrates JSR instruction to call a subroutine with PC-relative addressing",
    code: `; JSR Subroutine Example
; Calls a subroutine that doubles R1, then returns

ADD R1, R1, #5   ; R1 = 5
JSR double       ; Call subroutine, R7 = return address
ADD R2, R1, #0   ; R2 = R1 (copy result, R1 should be 10)
BRnzp done       ; Skip over subroutine

double:
    ADD R1, R1, R1   ; R1 = R1 * 2
    ; Note: RET not yet implemented, subroutine ends here
done:
    ADD R0, R0, #0   ; End of program`,
  },
  {
    title: "JSRR Indirect Subroutine Call",
    description: "Demonstrates JSRR instruction to call a subroutine via register",
    code: `; JSRR Indirect Subroutine Example
; Uses JSRR to jump to address stored in a register
; This is useful for function pointers and dispatch tables

ADD R1, R1, #3   ; R1 = 3 (value to negate)
ADD R3, R3, #6   ; R3 = 6 (offset to negate subroutine)
JSRR R3          ; Call subroutine at address in R3
                 ; R7 now contains return address
ADD R2, R1, #0   ; Copy result to R2
BRnzp end        ; Skip over subroutine

negate:
    NOT R1, R1       ; R1 = ~R1
    ADD R1, R1, #1   ; R1 = ~R1 + 1 = -R1 (two's complement)
end:
    ADD R0, R0, #0   ; End of program`,
  },
  {
    title: "Hello World (TRAP)",
    description: "Demonstrates LEA and TRAP instructions for console output using PUTS and HALT",
    code: `; Hello World Example
; Uses TRAP to print a string to the console

.ORIG x3000

; Load address of string into R0 using LEA
LEA R0, hello    ; R0 = address of hello string

; Print the string
PUTS             ; TRAP x22 - print null-terminated string at R0

; Halt the program
HALT             ; TRAP x25 - stop execution

; String data
hello:
.STRINGZ "Hello, LC-3b!"

.END`,
  },
  {
    title: "Character Output (TRAP)",
    description: "Demonstrates OUT trap to print individual characters",
    code: `; Character Output Example
; Uses OUT (TRAP x21) to print characters one at a time

.ORIG x3000

; Print 'H'
ADD R0, R0, #8    ; R0 = 8
ADD R0, R0, #8    ; R0 = 16
ADD R0, R0, #8    ; R0 = 24
ADD R0, R0, #8    ; R0 = 32
ADD R0, R0, #8    ; R0 = 40
ADD R0, R0, #8    ; R0 = 48
ADD R0, R0, #8    ; R0 = 56
ADD R0, R0, #8    ; R0 = 64
ADD R0, R0, #8    ; R0 = 72 = 'H'
OUT              ; Print character in R0

; Print 'i'
ADD R0, R0, #8    ; R0 = 80
ADD R0, R0, #8    ; R0 = 88
ADD R0, R0, #8    ; R0 = 96
ADD R0, R0, #9    ; R0 = 105 = 'i'
OUT              ; Print character in R0

; Print newline
AND R0, R0, #0   ; R0 = 0
ADD R0, R0, #10  ; R0 = 10 = newline
OUT              ; Print newline

HALT             ; Stop execution

.END`,
  },
];
