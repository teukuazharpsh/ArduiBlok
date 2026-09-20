// ============================================================
// arduino_blocks.js — Standard Blockly Blocks in English
// Classic Blockly standard styling matching https://www.blockly.com
// ============================================================

Blockly.defineBlocksWithJsonArray([

  // ── SETUP & LOOP ──────────────────────────────────────────
  {
    "type": "arduino_setup",
    "message0": "setup %1 %2",
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "SETUP_CODE" }
    ],
    "colour": 180,
    "tooltip": "Code inside this block runs once when the Arduino starts.",
    "helpUrl": "",
    "deletable": false
  },

  {
    "type": "arduino_loop",
    "message0": "loop %1 %2",
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "LOOP_CODE" }
    ],
    "colour": 195,
    "tooltip": "Code inside this block runs repeatedly forever.",
    "helpUrl": "",
    "deletable": false
  },

  // ── MOTORS & ACTUATORS ────────────────────────────────────
  {
    "type": "motor_dc",
    "message0": "DC motor  IN1 pin %1  IN2 pin %2  ENA pin %3",
    "args0": [
      { "type": "field_number", "name": "PIN_IN1", "value": 7, "min": 0, "max": 13 },
      { "type": "field_number", "name": "PIN_IN2", "value": 8, "min": 0, "max": 13 },
      { "type": "field_number", "name": "PIN_ENA", "value": 9, "min": 0, "max": 13 }
    ],
    "message1": "direction %1 speed %2",
    "args1": [
      {
        "type": "field_dropdown",
        "name": "DIRECTION",
        "options": [
          ["forward", "FORWARD"],
          ["backward", "BACKWARD"],
          ["stop", "STOP"]
        ]
      },
      { "type": "field_number", "name": "SPEED", "value": 200, "min": 0, "max": 255 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": "Control DC motor with L298N driver. IN1/IN2 set direction, ENA sets PWM speed (0-255).",
    "helpUrl": ""
  },

  // ── DIGITAL WRITE ─────────────────────────────────────────
  {
    "type": "digital_write",
    "message0": "digital write pin %1 to %2",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 13, "min": 0, "max": 13 },
      {
        "type": "field_dropdown",
        "name": "VALUE",
        "options": [
          ["HIGH", "HIGH"],
          ["LOW", "LOW"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 30,
    "tooltip": "Write a HIGH or LOW value to a digital pin.",
    "helpUrl": ""
  },

  // ── DIGITAL READ ──────────────────────────────────────────
  {
    "type": "digital_read",
    "message0": "digital read pin %1",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 2, "min": 0, "max": 13 }
    ],
    "output": "Number",
    "colour": 60,
    "tooltip": "Read the value from a digital pin (HIGH or LOW).",
    "helpUrl": ""
  },

  // ── ANALOG READ ───────────────────────────────────────────
  {
    "type": "analog_read",
    "message0": "analog read pin %1",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "PIN",
        "options": [
          ["A0", "A0"],
          ["A1", "A1"],
          ["A2", "A2"],
          ["A3", "A3"],
          ["A4", "A4"],
          ["A5", "A5"],
          ["A6", "A6"],
          ["A7", "A7"]
        ]
      }
    ],
    "output": "Number",
    "colour": 60,
    "tooltip": "Read analog value from pins A0-A7 (returns integer 0 to 1023).",
    "helpUrl": ""
  },

  // ── ANALOG WRITE (PWM) ────────────────────────────────────
  {
    "type": "analog_write",
    "message0": "analog write pin %1 value %2",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "PIN",
        "options": [
          ["3 (PWM)", "3"],
          ["5 (PWM)", "5"],
          ["6 (PWM)", "6"],
          ["9 (PWM)", "9"],
          ["10 (PWM)", "10"],
          ["11 (PWM)", "11"]
        ]
      },
      { "type": "input_value", "name": "VALUE" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 30,
    "tooltip": "Writes an analog value (PWM wave, 0-255) to a PWM-enabled pin.",
    "helpUrl": ""
  },

  // ── SERVO ─────────────────────────────────────────────────
  {
    "type": "servo_write",
    "message0": "set servo pin %1 to angle %2 °",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 9, "min": 0, "max": 13 },
      { "type": "field_number", "name": "ANGLE", "value": 90, "min": 0, "max": 180 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 45,
    "tooltip": "Set servo shaft to a specific angle (0-180 degrees). Automatically includes Servo.h.",
    "helpUrl": ""
  },

  // ── DELAY ─────────────────────────────────────────────────
  {
    "type": "delay_ms",
    "message0": "wait %1 ms",
    "args0": [
      { "type": "field_number", "name": "DURATION", "value": 1000, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": "Pause the program for the given amount of time in milliseconds.",
    "helpUrl": ""
  },

  // ── PIN MODE ──────────────────────────────────────────────
  {
    "type": "pin_mode",
    "message0": "set pin %1 mode to %2",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 13, "min": 0, "max": 13 },
      {
        "type": "field_dropdown",
        "name": "MODE",
        "options": [
          ["OUTPUT", "OUTPUT"],
          ["INPUT", "INPUT"],
          ["INPUT_PULLUP", "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Configure the specified pin to behave as an input or an output.",
    "helpUrl": ""
  },

  // ── SERIAL BEGIN ──────────────────────────────────────────
  {
    "type": "serial_begin",
    "message0": "Serial.begin baud rate %1",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "BAUD",
        "options": [
          ["9600", "9600"],
          ["115200", "115200"],
          ["57600", "57600"],
          ["38400", "38400"],
          ["19200", "19200"],
          ["4800", "4800"],
          ["2400", "2400"],
          ["1200", "1200"],
          ["300", "300"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Initializes serial communication at the specified baud rate (bits per second).",
    "helpUrl": ""
  },

  // ── SERIAL PRINTLN ────────────────────────────────────────
  {
    "type": "serial_print",
    "message0": "Serial println %1",
    "args0": [
      { "type": "input_value", "name": "TEXT" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Prints data to the serial port as human-readable ASCII text followed by a newline.",
    "helpUrl": ""
  },

  // ── SERIAL PRINT (NO NEWLINE) ─────────────────────────────
  {
    "type": "serial_print_inline",
    "message0": "Serial print %1",
    "args0": [
      { "type": "input_value", "name": "TEXT" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Prints data to the serial port as human-readable ASCII text without a trailing newline.",
    "helpUrl": ""
  },

  // ── SERIAL AVAILABLE (STATEMENT CONTAINER) ────────────────
  {
    "type": "serial_available_do",
    "message0": "if Serial.available() > 0 %1 %2",
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Executes enclosed blocks when data is available to read from the serial buffer (Serial.available() > 0).",
    "helpUrl": ""
  },

  // ── SERIAL AVAILABLE (VALUE) ──────────────────────────────
  {
    "type": "serial_available",
    "message0": "Serial.available()",
    "output": "Number",
    "colour": 160,
    "tooltip": "Returns the number of bytes available for reading from the serial port buffer.",
    "helpUrl": ""
  },

  // ── SERIAL READ (BYTE / CHAR) ─────────────────────────────
  {
    "type": "serial_read",
    "message0": "Serial.read()",
    "output": null,
    "colour": 160,
    "tooltip": "Reads the first incoming byte of serial data as a character/integer.",
    "helpUrl": ""
  },

  // ── SERIAL READ STRING ────────────────────────────────────
  {
    "type": "serial_read_string",
    "message0": "Serial.readString()",
    "output": "String",
    "colour": 160,
    "tooltip": "Reads characters from the serial buffer into a String.",
    "helpUrl": ""
  },

  // ── SERIAL PARSE INT ──────────────────────────────────────
  {
    "type": "serial_parse_int",
    "message0": "Serial.parseInt()",
    "output": "Number",
    "colour": 160,
    "tooltip": "Looks for the next valid integer in the incoming serial stream.",
    "helpUrl": ""
  },

  // ── TEXT STRING ───────────────────────────────────────────
  {
    "type": "text_string",
    "message0": "\" %1 \"",
    "args0": [
      { "type": "field_input", "name": "TEXT", "text": "Hello Arduino" }
    ],
    "output": "String",
    "colour": 160,
    "tooltip": "A text string.",
    "helpUrl": ""
  },

  // ── CHAR CHARACTER ────────────────────────────────────────
  {
    "type": "char_character",
    "message0": "' %1 '",
    "args0": [
      { "type": "field_input", "name": "CHAR", "text": "A" }
    ],
    "output": null,
    "colour": 160,
    "tooltip": "A single character literal.",
    "helpUrl": ""
  },

  // ── COMPARISON OPERATOR ───────────────────────────────────
  {
    "type": "compare_op",
    "message0": "%1 %2 %3",
    "args0": [
      { "type": "input_value", "name": "A" },
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          ["=", "=="],
          ["≠", "!="],
          ["<", "<"],
          [">", ">"],
          ["≤", "<="],
          ["≥", ">="]
        ]
      },
      { "type": "input_value", "name": "B" }
    ],
    "inputsInline": true,
    "output": "Boolean",
    "colour": 210,
    "tooltip": "Return true if both inputs match the comparison.",
    "helpUrl": ""
  },

  // ── MATH OPERATOR ─────────────────────────────────────────
  {
    "type": "math_op",
    "message0": "%1 %2 %3",
    "args0": [
      { "type": "input_value", "name": "A", "check": "Number" },
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          ["+", "+"],
          ["-", "-"],
          ["×", "*"],
          ["÷", "/"],
          ["%", "%"]
        ]
      },
      { "type": "input_value", "name": "B", "check": "Number" }
    ],
    "inputsInline": true,
    "output": "Number",
    "colour": 230,
    "tooltip": "Return the result of the arithmetic operation.",
    "helpUrl": ""
  },

  // ── NUMBER ────────────────────────────────────────────────
  {
    "type": "math_number",
    "message0": "%1",
    "args0": [
      { "type": "field_number", "name": "NUM", "value": 0 }
    ],
    "output": "Number",
    "colour": 230,
    "tooltip": "A number.",
    "helpUrl": ""
  },

  // ── BOOLEAN ───────────────────────────────────────────────
  {
    "type": "logic_boolean",
    "message0": "%1",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "BOOL",
        "options": [
          ["true", "true"],
          ["false", "false"]
        ]
      }
    ],
    "output": "Boolean",
    "colour": 210,
    "tooltip": "Returns either true or false.",
    "helpUrl": ""
  },

  // ── COMMENT / NOTES (TINKERCAD STYLE) ────────────────────
  {
    "type": "comment_block",
    "message0": "// %1",
    "args0": [
      {
        "type": "field_input",
        "name": "COMMENT",
        "text": "Catatan penjelasan singkat..."
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#78909c",
    "tooltip": "Catatan / komentar program (seperti di Tinkercad). Diabaikan oleh mikrokontroler dan tidak memakan memori Flash/RAM.",
    "helpUrl": ""
  },

  {
    "type": "comment_group_block",
    "message0": "// Catatan: %1 %2",
    "args0": [
      {
        "type": "field_input",
        "name": "COMMENT",
        "text": "Kelompok blok untuk fungsi ini..."
      },
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#78909c",
    "tooltip": "Membungkus sekumpulan blok dengan catatan penjelasan.",
    "helpUrl": ""
  },

  // ── IF / ELSE ─────────────────────────────────────────────
  {
    "type": "controls_if_arduino",
    "message0": "if %1",
    "args0": [
      { "type": "input_value", "name": "CONDITION", "check": "Boolean" }
    ],
    "message1": "do %1",
    "args1": [
      { "type": "input_statement", "name": "DO" }
    ],
    "message2": "else %1",
    "args2": [
      { "type": "input_statement", "name": "ELSE" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 210,
    "tooltip": "If the condition is true, execute the first block of statements. Otherwise, execute the second.",
    "helpUrl": ""
  },

  // ── IF ONLY ───────────────────────────────────────────────
  {
    "type": "controls_if_only",
    "message0": "if %1",
    "args0": [
      { "type": "input_value", "name": "CONDITION", "check": "Boolean" }
    ],
    "message1": "do %1",
    "args1": [
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 210,
    "tooltip": "If the condition is true, execute the statements.",
    "helpUrl": ""
  },

  // ── REPEAT (FOR LOOP) ─────────────────────────────────────
  {
    "type": "controls_repeat_arduino",
    "message0": "repeat %1 times %2 do %3",
    "args0": [
      { "type": "field_number", "name": "TIMES", "value": 10, "min": 0 },
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": "Do some statements several times.",
    "helpUrl": ""
  },

  // ── WHILE LOOP ────────────────────────────────────────────
  {
    "type": "controls_while_arduino",
    "message0": "repeat while %1 do %2",
    "args0": [
      { "type": "input_value", "name": "CONDITION", "check": "Boolean" },
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": "While a value is true, do some statements.",
    "helpUrl": ""
  },

  // ── NOT (LOGIC) ───────────────────────────────────────────
  {
    "type": "logic_not",
    "message0": "not %1",
    "args0": [
      { "type": "input_value", "name": "BOOL", "check": "Boolean" }
    ],
    "output": "Boolean",
    "colour": 210,
    "tooltip": "Returns true if the input is false. Returns false if the input is true.",
    "helpUrl": ""
  },

  // ── AND / OR (LOGIC) ─────────────────────────────────────
  {
    "type": "logic_operation",
    "message0": "%1 %2 %3",
    "args0": [
      { "type": "input_value", "name": "A", "check": "Boolean" },
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          ["and", "&&"],
          ["or", "||"]
        ]
      },
      { "type": "input_value", "name": "B", "check": "Boolean" }
    ],
    "inputsInline": true,
    "output": "Boolean",
    "colour": 210,
    "tooltip": "Returns true if both inputs are true (and), or if at least one is true (or).",
    "helpUrl": ""
  },

  // ── MAP ───────────────────────────────────────────────────
  {
    "type": "map_value",
    "message0": "map %1 from [%2 .. %3] to [%4 .. %5]",
    "args0": [
      { "type": "input_value", "name": "VALUE", "check": "Number" },
      { "type": "field_number", "name": "FROM_LOW", "value": 0 },
      { "type": "field_number", "name": "FROM_HIGH", "value": 1023 },
      { "type": "field_number", "name": "TO_LOW", "value": 0 },
      { "type": "field_number", "name": "TO_HIGH", "value": 255 }
    ],
    "output": "Number",
    "colour": 230,
    "tooltip": "Re-maps a number from one range to another.",
    "helpUrl": ""
  },

  // ── VARIABLE DECLARE ──────────────────────────────────────
  {
    "type": "variables_declare_arduino",
    "message0": "declare %1 %2 = %3",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "TYPE",
        "options": [
          [ "int", "int" ],
          [ "float", "float" ],
          [ "char", "char" ],
          [ "String", "String" ],
          [ "boolean", "bool" ],
          [ "long", "long" ],
          [ "byte", "byte" ],
          [ "double", "double" ]
        ]
      },
      { "type": "field_input", "name": "VAR_NAME", "text": "item" },
      { "type": "input_value", "name": "VALUE" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330,
    "tooltip": "Declares an Arduino variable with a data type (int, float, char, String, boolean, long, byte) and initial value.",
    "helpUrl": ""
  },

  // ── VARIABLE SET ──────────────────────────────────────────
  {
    "type": "variables_set_arduino",
    "message0": "set %1 %2 to %3",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "TYPE",
        "options": [
          [ "int", "int" ],
          [ "float", "float" ],
          [ "char", "char" ],
          [ "String", "String" ],
          [ "boolean", "bool" ],
          [ "long", "long" ],
          [ "byte", "byte" ],
          [ "double", "double" ]
        ]
      },
      { "type": "field_input", "name": "VAR_NAME", "text": "item" },
      { "type": "input_value", "name": "VALUE" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330,
    "tooltip": "Sets this variable with the chosen data type (int, float, char, String, boolean, long, byte).",
    "helpUrl": ""
  },

  // ── VARIABLE GET ──────────────────────────────────────────
  {
    "type": "variables_get_arduino",
    "message0": "%1",
    "args0": [
      { "type": "field_input", "name": "VAR_NAME", "text": "item" }
    ],
    "output": null,
    "colour": 330,
    "tooltip": "Returns the value of this variable.",
    "helpUrl": ""
  },

  // ── MOTOR SHIELD L293D ─────────────────────────────────────
  {
    "type": "motor_driver_shield",
    "message0": "motor shield %1 direction %2 speed %3",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "MOTOR_NUM",
        "options": [
          [ "M1", "1" ],
          [ "M2", "2" ],
          [ "M3", "3" ],
          [ "M4", "4" ]
        ]
      },
      {
        "type": "field_dropdown",
        "name": "COMMAND",
        "options": [
          [ "FORWARD", "FORWARD" ],
          [ "BACKWARD", "BACKWARD" ],
          [ "BRAKE", "BRAKE" ],
          [ "RELEASE", "RELEASE" ]
        ]
      },
      {
        "type": "field_number",
        "name": "SPEED",
        "value": 255,
        "min": 0,
        "max": 255
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": "Control DC motor on L293D Arduino Motor Shield (M1-M4).",
    "helpUrl": ""
  }

]);
