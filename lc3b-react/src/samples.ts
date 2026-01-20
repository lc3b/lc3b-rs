export interface SampleProgram {
  title: string;
  description: string;
  code: string;
}

export const assemblyExamples: SampleProgram[] = [
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
    RET              ; Return to caller (PC = R7)
done:
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
  {
    title: "Self-Modifying Code",
    description: "Demonstrates von Neumann architecture by modifying an instruction at runtime to create a counter",
    code: `; Self-Modifying Code Example
; Demonstrates how code and data share the same memory
;
; This program modifies the imm5 field of an ADD instruction
; at runtime to create an incrementing counter.
;
; Note: LC-3b uses LDW/STW with base+offset addressing,
; so we use LEA to get addresses into a base register.

.ORIG x3000

; === SETUP ===
; Get base addresses for our data using LEA
LEA R4, target    ; R4 = address of target instruction
LEA R5, mask      ; R5 = address of mask

; === MAIN LOOP ===
loop:
    ; Load the instruction we'll modify into R1
    LDW R1, R4, #0    ; R1 = instruction at 'target'

    ; Extract current imm5 value:
    ; The imm5 field is in bits [4:0]
    ; We mask with 0x001F to isolate these bits
    LDW R2, R5, #0    ; R2 = mask value (0x001F)
    AND R3, R1, R2    ; R3 = current counter value

    ; Display counter in R0 (visible in register view)
    ADD R0, R3, #0

    ; Increment the counter by adding 1 to the instruction
    ; Since imm5 is in the low bits, we can just ADD #1
    ADD R1, R1, #1

    ; Store modified instruction back to memory
    STW R1, R4, #0    ; Write back to 'target'

    ; Check if we've counted to 10
    ADD R3, R3, #-10
    BRn loop          ; Continue if counter < 10

    HALT

; === DATA ===
; This ADD instruction gets modified each iteration
; Initially: ADD R0, R0, #0
; After 1st loop: ADD R0, R0, #1
; After 2nd loop: ADD R0, R0, #2
; ...and so on
target:
    ADD R0, R0, #0

; Mask to extract bits [4:0]
mask:
    .FILL x001F

.END`,
  },
];

export const cExamples: SampleProgram[] = [
  {
    title: "Hello World",
    description: "Print a message to the console",
    code: `#include <lc3b-io.h>

int main() {
    puts("Hello, LC-3b!");
    return 0;
}`,
  },
  {
    title: "Bitwise AND",
    description: "Demonstrates the bitwise AND operator",
    code: `// Bitwise AND example
// Result is stored in R1

int main() {
    int a = 15;    // 0x000F in binary: 0000 0000 0000 1111
    int b = 7;     // 0x0007 in binary: 0000 0000 0000 0111
    int c = a & b; // Result: 7 (0x0007)
    return c;
}`,
  },
  {
    title: "Bitwise OR",
    description: "Demonstrates the bitwise OR operator",
    code: `// Bitwise OR example
// Result is stored in R1

int main() {
    int a = 12;    // 0x000C in binary: 0000 0000 0000 1100
    int b = 5;     // 0x0005 in binary: 0000 0000 0000 0101
    int c = a | b; // Result: 13 (0x000D)
    return c;
}`,
  },
  {
    title: "Bitwise XOR",
    description: "Demonstrates the bitwise XOR operator",
    code: `// Bitwise XOR example
// XOR: bits differ = 1, bits same = 0

int main() {
    int a = 12;    // 0x000C in binary: 0000 0000 0000 1100
    int b = 10;    // 0x000A in binary: 0000 0000 0000 1010
    int c = a ^ b; // Result: 6 (0x0006)
    return c;
}`,
  },
  {
    title: "Bitwise NOT",
    description: "Demonstrates the bitwise NOT (complement) operator",
    code: `// Bitwise NOT example
// Flips all bits

int main() {
    int a = 0;
    int b = ~a;  // Result: -1 (0xFFFF, all bits set)
    return b;
}`,
  },
  {
    title: "For Loop: Sum",
    description: "Sum numbers 1 to 5 using a for loop",
    code: `// For loop example
// Calculates 1 + 2 + 3 + 4 + 5 = 15

int main() {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum = sum + i;
    }
    return sum;
}`,
  },
  {
    title: "For Loop: Countdown",
    description: "Count down from 5 to 1",
    code: `#include <lc3b-io.h>

// Countdown using a for loop
// Prints: 5 4 3 2 1

int main() {
    for (int i = 5; i >= 1; i--) {
        // Print digit (add '0' to convert to ASCII)
        putchar('0' + i);
        putchar(' ');
    }
    return 0;
}`,
  },
  {
    title: "String: Print Characters",
    description: "Print a string character by character",
    code: `#include <lc3b-io.h>

// Print each character of "Hi" manually

int main() {
    putchar('H');
    putchar('i');
    putchar('!');
    return 0;
}`,
  },
  {
    title: "String: Using puts()",
    description: "Print strings using the puts() function",
    code: `#include <lc3b-io.h>

// Print multiple strings

int main() {
    puts("Line 1");
    puts("Line 2");
    puts("Done!");
    return 0;
}`,
  },
  {
    title: "Arithmetic",
    description: "Basic arithmetic operations",
    code: `// Arithmetic example
// Demonstrates add and subtract

int main() {
    int a = 10;
    int b = 3;
    int sum = a + b;   // 13
    int diff = a - b;  // 7
    return diff;
}`,
  },
];

// Legacy export for backwards compatibility
export const samplePrograms = assemblyExamples;
