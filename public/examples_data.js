// ============================================================
// examples_data.js — Galeri Contoh Proyek Bawaan ArduiBlok
// ============================================================

window.ARDUIBLOK_EXAMPLES = [
  // ── KATEGORI: DASAR & LED ─────────────────────────────────
  {
    id: 'blink_led',
    title: 'Blink LED (Kedip Dasar)',
    category: 'basic',
    categoryName: 'Dasar & LED',
    difficulty: 'Pemula',
    difficultyColor: 'green',
    icon: '💡',
    description: 'Menyalakan dan mematikan LED internal (Pin 13) secara bergantian dengan jeda interval 1 detik (1000 milidetik). Proyek awal standar untuk menguji mikrokontroler.',
    pins: [
      { name: 'Pin 13', desc: 'Built-in LED / Anoda LED' },
      { name: 'GND', desc: 'Katoda LED (-)' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30"></block>' +
      '<block type="arduino_loop" x="40" y="150">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="digital_write">' +
      '      <value name="PIN"><shadow type="pin_digital"><field name="PIN">13</field></shadow></value>' +
      '      <field name="VALUE">HIGH</field>' +
      '      <next>' +
      '        <block type="delay_ms">' +
      '          <field name="DURATION">1000</field>' +
      '          <next>' +
      '            <block type="digital_write">' +
      '              <value name="PIN"><shadow type="pin_digital"><field name="PIN">13</field></shadow></value>' +
      '              <field name="VALUE">LOW</field>' +
      '              <next>' +
      '                <block type="delay_ms">' +
      '                  <field name="DURATION">1000</field>' +
      '                </block>' +
      '              </next>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  {
    id: 'traffic_lights',
    title: 'Lampu Lalu Lintas (Traffic Light)',
    category: 'basic',
    categoryName: 'Dasar & LED',
    difficulty: 'Pemula',
    difficultyColor: 'green',
    icon: '🚦',
    description: 'Simulasi lampu pengatur lalu lintas 3 warna: Hijau menyala 3 detik, Kuning hati-hati 1 detik, dan Merah berhenti 4 detik.',
    pins: [
      { name: 'Pin 10', desc: 'LED Merah' },
      { name: 'Pin 9', desc: 'LED Kuning' },
      { name: 'Pin 8', desc: 'LED Hijau' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30"></block>' +
      '<block type="arduino_loop" x="40" y="150">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="comment_block">' +
      '      <field name="COMMENT">Fase 1: Lampu Hijau Nyala (Jalan)</field>' +
      '      <next>' +
      '        <block type="digital_write">' +
      '          <value name="PIN"><shadow type="pin_digital"><field name="PIN">8</field></shadow></value>' +
      '          <field name="VALUE">HIGH</field>' +
      '          <next>' +
      '            <block type="digital_write">' +
      '              <value name="PIN"><shadow type="pin_digital"><field name="PIN">9</field></shadow></value>' +
      '              <field name="VALUE">LOW</field>' +
      '              <next>' +
      '                <block type="digital_write">' +
      '                  <value name="PIN"><shadow type="pin_digital"><field name="PIN">10</field></shadow></value>' +
      '                  <field name="VALUE">LOW</field>' +
      '                  <next>' +
      '                    <block type="delay_ms">' +
      '                      <field name="DURATION">3000</field>' +
      '                      <next>' +
      '                        <block type="comment_block">' +
      '                          <field name="COMMENT">Fase 2: Lampu Kuning Nyala (Hati-hati)</field>' +
      '                          <next>' +
      '                            <block type="digital_write">' +
      '                              <value name="PIN"><shadow type="pin_digital"><field name="PIN">8</field></shadow></value>' +
      '                              <field name="VALUE">LOW</field>' +
      '                              <next>' +
      '                                <block type="digital_write">' +
      '                                  <value name="PIN"><shadow type="pin_digital"><field name="PIN">9</field></shadow></value>' +
      '                                  <field name="VALUE">HIGH</field>' +
      '                                  <next>' +
      '                                    <block type="delay_ms">' +
      '                                      <field name="DURATION">1000</field>' +
      '                                      <next>' +
      '                                        <block type="comment_block">' +
      '                                          <field name="COMMENT">Fase 3: Lampu Merah Nyala (Berhenti)</field>' +
      '                                          <next>' +
      '                                            <block type="digital_write">' +
      '                                              <value name="PIN"><shadow type="pin_digital"><field name="PIN">9</field></shadow></value>' +
      '                                              <field name="VALUE">LOW</field>' +
      '                                              <next>' +
      '                                                <block type="digital_write">' +
      '                                                  <value name="PIN"><shadow type="pin_digital"><field name="PIN">10</field></shadow></value>' +
      '                                                  <field name="VALUE">HIGH</field>' +
      '                                                  <next>' +
      '                                                    <block type="delay_ms">' +
      '                                                      <field name="DURATION">4000</field>' +
      '                                                    </block>' +
      '                                                  </next>' +
      '                                                </block>' +
      '                                              </next>' +
      '                                            </block>' +
      '                                          </next>' +
      '                                        </block>' +
      '                                      </next>' +
      '                                    </block>' +
      '                                  </next>' +
      '                                </block>' +
      '                              </next>' +
      '                            </block>' +
      '                          </next>' +
      '                        </block>' +
      '                      </next>' +
      '                    </block>' +
      '                  </next>' +
      '                </block>' +
      '              </next>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  {
    id: 'running_led',
    title: 'Running LED (Lampu Berjalan 4 Pin)',
    category: 'basic',
    categoryName: 'Dasar & LED',
    difficulty: 'Pemula',
    difficultyColor: 'green',
    icon: '✨',
    description: 'Efek lampu LED menyala berurutan dari Pin 8 hingga Pin 11 layaknya animasi lampu knight rider atau lampu hias.',
    pins: [
      { name: 'Pin 8', desc: 'LED 1' },
      { name: 'Pin 9', desc: 'LED 2' },
      { name: 'Pin 10', desc: 'LED 3' },
      { name: 'Pin 11', desc: 'LED 4' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30"></block>' +
      '<block type="arduino_loop" x="40" y="150">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="digital_write">' +
      '      <value name="PIN"><shadow type="pin_digital"><field name="PIN">8</field></shadow></value>' +
      '      <field name="VALUE">HIGH</field>' +
      '      <next>' +
      '        <block type="delay_ms">' +
      '          <field name="DURATION">150</field>' +
      '          <next>' +
      '            <block type="digital_write">' +
      '              <value name="PIN"><shadow type="pin_digital"><field name="PIN">8</field></shadow></value>' +
      '              <field name="VALUE">LOW</field>' +
      '              <next>' +
      '                <block type="digital_write">' +
      '                  <value name="PIN"><shadow type="pin_digital"><field name="PIN">9</field></shadow></value>' +
      '                  <field name="VALUE">HIGH</field>' +
      '                  <next>' +
      '                    <block type="delay_ms">' +
      '                      <field name="DURATION">150</field>' +
      '                      <next>' +
      '                        <block type="digital_write">' +
      '                          <value name="PIN"><shadow type="pin_digital"><field name="PIN">9</field></shadow></value>' +
      '                          <field name="VALUE">LOW</field>' +
      '                          <next>' +
      '                            <block type="digital_write">' +
      '                              <value name="PIN"><shadow type="pin_digital"><field name="PIN">10</field></shadow></value>' +
      '                              <field name="VALUE">HIGH</field>' +
      '                              <next>' +
      '                                <block type="delay_ms">' +
      '                                  <field name="DURATION">150</field>' +
      '                                  <next>' +
      '                                    <block type="digital_write">' +
      '                                      <value name="PIN"><shadow type="pin_digital"><field name="PIN">10</field></shadow></value>' +
      '                                      <field name="VALUE">LOW</field>' +
      '                                      <next>' +
      '                                        <block type="digital_write">' +
      '                                          <value name="PIN"><shadow type="pin_digital"><field name="PIN">11</field></shadow></value>' +
      '                                          <field name="VALUE">HIGH</field>' +
      '                                          <next>' +
      '                                            <block type="delay_ms">' +
      '                                              <field name="DURATION">150</field>' +
      '                                              <next>' +
      '                                                <block type="digital_write">' +
      '                                                  <value name="PIN"><shadow type="pin_digital"><field name="PIN">11</field></shadow></value>' +
      '                                                  <field name="VALUE">LOW</field>' +
      '                                                  <next>' +
      '                                                    <block type="delay_ms">' +
      '                                                      <field name="DURATION">100</field>' +
      '                                                    </block>' +
      '                                                  </next>' +
      '                                                </block>' +
      '                                              </next>' +
      '                                            </block>' +
      '                                          </next>' +
      '                                        </block>' +
      '                                      </next>' +
      '                                    </block>' +
      '                                  </next>' +
      '                                </block>' +
      '                              </next>' +
      '                            </block>' +
      '                          </next>' +
      '                        </block>' +
      '                      </next>' +
      '                    </block>' +
      '                  </next>' +
      '                </block>' +
      '              </next>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  // ── KATEGORI: SENSOR & INPUT ──────────────────────────────
  {
    id: 'button_toggle_led',
    title: 'Tombol Push Button & LED',
    category: 'sensors',
    categoryName: 'Sensor & Input',
    difficulty: 'Pemula',
    difficultyColor: 'green',
    icon: '🔘',
    description: 'Membaca status logika tombol tekan pada Pin 2. Ketika tombol ditekan (HIGH), LED Pin 13 akan menyala; jika dilepas, LED akan padam.',
    pins: [
      { name: 'Pin 2', desc: 'Push Button (Input)' },
      { name: 'Pin 13', desc: 'LED Indikator (Output)' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30">' +
      '  <statement name="SETUP_CODE">' +
      '    <block type="serial_begin">' +
      '      <field name="BAUD">9600</field>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '<block type="arduino_loop" x="40" y="160">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="controls_if_arduino">' +
      '      <value name="CONDITION">' +
      '        <block type="compare_op">' +
      '          <field name="OP">==</field>' +
      '          <value name="A">' +
      '            <block type="digital_read">' +
      '              <value name="PIN"><shadow type="pin_digital"><field name="PIN">2</field></shadow></value>' +
      '            </block>' +
      '          </value>' +
      '          <value name="B">' +
      '            <block type="digital_level"><field name="VALUE">HIGH</field></block>' +
      '          </value>' +
      '        </block>' +
      '      </value>' +
      '      <statement name="DO">' +
      '        <block type="digital_write">' +
      '          <value name="PIN"><shadow type="pin_digital"><field name="PIN">13</field></shadow></value>' +
      '          <field name="VALUE">HIGH</field>' +
      '        </block>' +
      '      </statement>' +
      '      <statement name="ELSE">' +
      '        <block type="digital_write">' +
      '          <value name="PIN"><shadow type="pin_digital"><field name="PIN">13</field></shadow></value>' +
      '          <field name="VALUE">LOW</field>' +
      '        </block>' +
      '      </statement>' +
      '      <next>' +
      '        <block type="delay_ms">' +
      '          <field name="DURATION">20</field>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  {
    id: 'potentiometer_pwm',
    title: 'Potensiometer & LED Dimmer PWM',
    category: 'sensors',
    categoryName: 'Sensor & Input',
    difficulty: 'Menengah',
    difficultyColor: 'orange',
    icon: '🎛️',
    description: 'Membaca nilai resistansi analog putaran potensiometer (0-1023) pada Pin A0 lalu memetakannya (map) ke nilai PWM (0-255) pada Pin 9 untuk mengatur tingkat kecerahan LED.',
    pins: [
      { name: 'Pin A0', desc: 'Pin Tengah Potensiometer' },
      { name: 'Pin 9 (PWM)', desc: 'Anoda LED Dimmer' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30">' +
      '  <statement name="SETUP_CODE">' +
      '    <block type="serial_begin">' +
      '      <field name="BAUD">9600</field>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '<block type="arduino_loop" x="40" y="160">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="analog_write">' +
      '      <field name="PIN">9</field>' +
      '      <value name="VALUE">' +
      '        <block type="map_value">' +
      '          <field name="FROM_LOW">0</field>' +
      '          <field name="FROM_HIGH">1023</field>' +
      '          <field name="TO_LOW">0</field>' +
      '          <field name="TO_HIGH">255</field>' +
      '          <value name="VALUE">' +
      '            <block type="analog_read"><field name="PIN">A0</field></block>' +
      '          </value>' +
      '        </block>' +
      '      </value>' +
      '      <next>' +
      '        <block type="serial_print">' +
      '          <value name="TEXT">' +
      '            <block type="text_join_simple">' +
      '              <value name="A"><shadow type="text_string"><field name="TEXT">Nilai Analog A0: </field></shadow></value>' +
      '              <value name="B"><block type="analog_read"><field name="PIN">A0</field></block></value>' +
      '            </block>' +
      '          </value>' +
      '          <next>' +
      '            <block type="delay_ms">' +
      '              <field name="DURATION">100</field>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  {
    id: 'ldr_auto_light',
    title: 'Sensor Cahaya LDR (Lampu Otomatis)',
    category: 'sensors',
    categoryName: 'Sensor & Input',
    difficulty: 'Pemula',
    difficultyColor: 'green',
    icon: '☀️',
    description: 'Sistem lampu malam pintar: Sensor LDR mendeteksi tingkat kegelapan. Jika intensitas cahaya di bawah ambang batas (ADC < 400), lampu menyala secara otomatis.',
    pins: [
      { name: 'Pin A0', desc: 'Voltage Divider Sensor LDR' },
      { name: 'Pin 13', desc: 'Relay / Lampu Indikator' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30">' +
      '  <statement name="SETUP_CODE">' +
      '    <block type="serial_begin">' +
      '      <field name="BAUD">9600</field>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '<block type="arduino_loop" x="40" y="160">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="controls_if_arduino">' +
      '      <value name="CONDITION">' +
      '        <block type="compare_op">' +
      '          <field name="OP">&lt;</field>' +
      '          <value name="A"><block type="analog_read"><field name="PIN">A0</field></block></value>' +
      '          <value name="B"><shadow type="math_number"><field name="NUM">400</field></shadow></value>' +
      '        </block>' +
      '      </value>' +
      '      <statement name="DO">' +
      '        <block type="digital_write">' +
      '          <value name="PIN"><shadow type="pin_digital"><field name="PIN">13</field></shadow></value>' +
      '          <field name="VALUE">HIGH</field>' +
      '          <next>' +
      '            <block type="serial_print">' +
      '              <value name="TEXT"><shadow type="text_string"><field name="TEXT">Kondisi: Gelap -&gt; Lampu MENYALA</field></shadow></value>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </statement>' +
      '      <statement name="ELSE">' +
      '        <block type="digital_write">' +
      '          <value name="PIN"><shadow type="pin_digital"><field name="PIN">13</field></shadow></value>' +
      '          <field name="VALUE">LOW</field>' +
      '          <next>' +
      '            <block type="serial_print">' +
      '              <value name="TEXT"><shadow type="text_string"><field name="TEXT">Kondisi: Terang -&gt; Lampu PADAM</field></shadow></value>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </statement>' +
      '      <next>' +
      '        <block type="delay_ms">' +
      '          <field name="DURATION">300</field>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  // ── KATEGORI: MOTOR & OUTPUT ──────────────────────────────
  {
    id: 'servo_sweep',
    title: 'Servo Motor Sweep (0° - 180°)',
    category: 'motors',
    categoryName: 'Motor & Output',
    difficulty: 'Pemula',
    difficultyColor: 'green',
    icon: '🦾',
    description: 'Menggerakkan lengan servo motor SG90 / MG995 ke 3 sudut posisi utama (0°, 90°, dan 180°) secara presisi dengan library Servo bawaan.',
    pins: [
      { name: 'Pin 9', desc: 'Kabel Sinyal Servo (Kuning/Oranye)' },
      { name: '5V & GND', desc: 'Daya Servo (Merah & Cokelat)' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30"></block>' +
      '<block type="arduino_loop" x="40" y="150">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="servo_write">' +
      '      <field name="PIN">9</field>' +
      '      <field name="ANGLE">0</field>' +
      '      <next>' +
      '        <block type="delay_ms">' +
      '          <field name="DURATION">1000</field>' +
      '          <next>' +
      '            <block type="servo_write">' +
      '              <field name="PIN">9</field>' +
      '              <field name="ANGLE">90</field>' +
      '              <next>' +
      '                <block type="delay_ms">' +
      '                  <field name="DURATION">1000</field>' +
      '                  <next>' +
      '                    <block type="servo_write">' +
      '                      <field name="PIN">9</field>' +
      '                      <field name="ANGLE">180</field>' +
      '                      <next>' +
      '                        <block type="delay_ms">' +
      '                          <field name="DURATION">1000</field>' +
      '                        </block>' +
      '                      </next>' +
      '                    </block>' +
      '                  </next>' +
      '                </block>' +
      '              </next>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  {
    id: 'l298n_dc_motor',
    title: 'Motor Driver DC L298N (Maju, Mundur, Stop)',
    category: 'motors',
    categoryName: 'Motor & Output',
    difficulty: 'Menengah',
    difficultyColor: 'orange',
    icon: '⚙️',
    description: 'Mengendalikan arah putaran motor DC (Maju/Mundur/Stop) beserta kecepatan rotasi PWM melalui modul driver motor L298N.',
    pins: [
      { name: 'Pin 7', desc: 'Driver IN1' },
      { name: 'Pin 8', desc: 'Driver IN2' },
      { name: 'Pin 9 (PWM)', desc: 'Driver ENA (Speed)' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30"></block>' +
      '<block type="arduino_loop" x="40" y="150">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="comment_block">' +
      '      <field name="COMMENT">Putar Maju (Forward) - Kecepatan 200</field>' +
      '      <next>' +
      '        <block type="motor_dc">' +
      '          <field name="PIN_IN1">7</field>' +
      '          <field name="PIN_IN2">8</field>' +
      '          <field name="PIN_ENA">9</field>' +
      '          <field name="DIRECTION">FORWARD</field>' +
      '          <field name="SPEED">200</field>' +
      '          <next>' +
      '            <block type="delay_ms">' +
      '              <field name="DURATION">3000</field>' +
      '              <next>' +
      '                <block type="comment_block">' +
      '                  <field name="COMMENT">Putar Mundur (Backward) - Kecepatan 160</field>' +
      '                  <next>' +
      '                    <block type="motor_dc">' +
      '                      <field name="PIN_IN1">7</field>' +
      '                      <field name="PIN_IN2">8</field>' +
      '                      <field name="PIN_ENA">9</field>' +
      '                      <field name="DIRECTION">BACKWARD</field>' +
      '                      <field name="SPEED">160</field>' +
      '                      <next>' +
      '                        <block type="delay_ms">' +
      '                          <field name="DURATION">3000</field>' +
      '                          <next>' +
      '                            <block type="comment_block">' +
      '                              <field name="COMMENT">Hentikan Motor (Stop)</field>' +
      '                              <next>' +
      '                                <block type="motor_dc">' +
      '                                  <field name="PIN_IN1">7</field>' +
      '                                  <field name="PIN_IN2">8</field>' +
      '                                  <field name="PIN_ENA">9</field>' +
      '                                  <field name="DIRECTION">STOP</field>' +
      '                                  <field name="SPEED">0</field>' +
      '                                  <next>' +
      '                                    <block type="delay_ms">' +
      '                                      <field name="DURATION">2000</field>' +
      '                                    </block>' +
      '                                  </next>' +
      '                                </block>' +
      '                              </next>' +
      '                            </block>' +
      '                          </next>' +
      '                        </block>' +
      '                      </next>' +
      '                    </block>' +
      '                  </next>' +
      '                </block>' +
      '              </next>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  // ── KATEGORI: SERIAL & DATA ───────────────────────────────
  {
    id: 'serial_plotter_wave',
    title: 'Serial Plotter Grafik Multi-Data',
    category: 'serial',
    categoryName: 'Serial & Data',
    difficulty: 'Menengah',
    difficultyColor: 'orange',
    icon: '📈',
    description: 'Mengirim format data multi-channel (Potensio:nilai, LDR:nilai) melalui Serial untuk dipantau secara real-time pada fitur Serial Plotter ArduiBlok.',
    pins: [
      { name: 'Pin A0', desc: 'Sensor Analog 1' },
      { name: 'Pin A1', desc: 'Sensor Analog 2' },
      { name: 'USB', desc: 'Komunikasi Serial 9600 bps' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30">' +
      '  <statement name="SETUP_CODE">' +
      '    <block type="serial_begin">' +
      '      <field name="BAUD">9600</field>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '<block type="arduino_loop" x="40" y="160">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="serial_print">' +
      '      <value name="TEXT">' +
      '        <block type="text_join">' +
      '          <mutation items="4"></mutation>' +
      '          <value name="ADD0"><shadow type="text_string"><field name="TEXT">Potensio:</field></shadow></value>' +
      '          <value name="ADD1"><block type="analog_read"><field name="PIN">A0</field></block></value>' +
      '          <value name="ADD2"><shadow type="text_string"><field name="TEXT">, LDR:</field></shadow></value>' +
      '          <value name="ADD3"><block type="analog_read"><field name="PIN">A1</field></block></value>' +
      '        </block>' +
      '      </value>' +
      '      <next>' +
      '        <block type="delay_ms">' +
      '          <field name="DURATION">50</field>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  {
    id: 'serial_command_controller',
    title: 'Kontrol LED via Serial Monitor',
    category: 'serial',
    categoryName: 'Serial & Data',
    difficulty: 'Lanjutan',
    difficultyColor: 'purple',
    icon: '💻',
    description: 'Menerima karakter perintah dari Serial Terminal. Ketik "1" pada Serial Monitor untuk menyalakan LED Pin 13 dan ketik "0" untuk memadamkannya.',
    pins: [
      { name: 'Pin 13', desc: 'LED Output' },
      { name: 'USB', desc: 'Input Serial Terminal' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30">' +
      '  <statement name="SETUP_CODE">' +
      '    <block type="serial_begin">' +
      '      <field name="BAUD">9600</field>' +
      '      <next>' +
      '        <block type="serial_print">' +
      '          <value name="TEXT"><shadow type="text_string"><field name="TEXT">Sistem Siap! Ketik 1=ON, 0=OFF</field></shadow></value>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '<block type="arduino_loop" x="40" y="190">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="serial_available_do">' +
      '      <statement name="DO">' +
      '        <block type="variables_declare_arduino">' +
      '          <field name="TYPE">char</field>' +
      '          <field name="VAR_NAME">cmd</field>' +
      '          <value name="VALUE"><block type="serial_read"></block></value>' +
      '          <next>' +
      '            <block type="controls_if_arduino">' +
      '              <value name="CONDITION">' +
      '                <block type="compare_op">' +
      '                  <field name="OP">==</field>' +
      '                  <value name="A"><block type="variables_get_arduino"><field name="VAR_NAME">cmd</field></block></value>' +
      '                  <value name="B"><block type="char_character"><field name="CHAR">1</field></block></value>' +
      '                </block>' +
      '              </value>' +
      '              <statement name="DO">' +
      '                <block type="digital_write">' +
      '                  <value name="PIN"><shadow type="pin_digital"><field name="PIN">13</field></shadow></value>' +
      '                  <field name="VALUE">HIGH</field>' +
      '                  <next>' +
      '                    <block type="serial_print">' +
      '                      <value name="TEXT"><shadow type="text_string"><field name="TEXT">&gt; LED MENYALA</field></shadow></value>' +
      '                    </block>' +
      '                  </next>' +
      '                </block>' +
      '              </statement>' +
      '              <next>' +
      '                <block type="controls_if_arduino">' +
      '                  <value name="CONDITION">' +
      '                    <block type="compare_op">' +
      '                      <field name="OP">==</field>' +
      '                      <value name="A"><block type="variables_get_arduino"><field name="VAR_NAME">cmd</field></block></value>' +
      '                      <value name="B"><block type="char_character"><field name="CHAR">0</field></block></value>' +
      '                    </block>' +
      '                  </value>' +
      '                  <statement name="DO">' +
      '                    <block type="digital_write">' +
      '                      <value name="PIN"><shadow type="pin_digital"><field name="PIN">13</field></shadow></value>' +
      '                      <field name="VALUE">LOW</field>' +
      '                      <next>' +
      '                        <block type="serial_print">' +
      '                          <value name="TEXT"><shadow type="text_string"><field name="TEXT">&gt; LED PADAM</field></shadow></value>' +
      '                        </block>' +
      '                      </next>' +
      '                    </block>' +
      '                  </statement>' +
      '                </block>' +
      '              </next>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </statement>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  },

  // ── KATEGORI: ROBOTIKA & SHIELD ───────────────────────────
  {
    id: 'l293d_motor_shield_4wd',
    title: 'Robot 4WD Motor Shield L293D',
    category: 'robotics',
    categoryName: 'Robotika & Shield',
    difficulty: 'Menengah',
    difficultyColor: 'orange',
    icon: '🤖',
    description: 'Mengendalikan 2 motor DC (M1 & M2) pada ekspansi Arduino Motor Shield L293D untuk manuver robot: Maju 2 detik, Mundur 2 detik, lalu Berhenti.',
    pins: [
      { name: 'Shield M1', desc: 'Motor Kiri' },
      { name: 'Shield M2', desc: 'Motor Kanan' },
      { name: 'Eksternal', desc: 'Baterai 7.4V - 12V ke Shield' }
    ],
    xml: '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="40" y="30"></block>' +
      '<block type="arduino_loop" x="40" y="150">' +
      '  <statement name="LOOP_CODE">' +
      '    <block type="comment_block">' +
      '      <field name="COMMENT">Gerak Maju (Forward)</field>' +
      '      <next>' +
      '        <block type="motor_driver_shield">' +
      '          <field name="MOTOR_NUM">1</field>' +
      '          <field name="COMMAND">FORWARD</field>' +
      '          <field name="SPEED">255</field>' +
      '          <next>' +
      '            <block type="motor_driver_shield">' +
      '              <field name="MOTOR_NUM">2</field>' +
      '              <field name="COMMAND">FORWARD</field>' +
      '              <field name="SPEED">255</field>' +
      '              <next>' +
      '                <block type="delay_ms">' +
      '                  <field name="DURATION">2000</field>' +
      '                  <next>' +
      '                    <block type="comment_block">' +
      '                      <field name="COMMENT">Gerak Mundur (Backward)</field>' +
      '                      <next>' +
      '                        <block type="motor_driver_shield">' +
      '                          <field name="MOTOR_NUM">1</field>' +
      '                          <field name="COMMAND">BACKWARD</field>' +
      '                          <field name="SPEED">200</field>' +
      '                          <next>' +
      '                            <block type="motor_driver_shield">' +
      '                              <field name="MOTOR_NUM">2</field>' +
      '                              <field name="COMMAND">BACKWARD</field>' +
      '                              <field name="SPEED">200</field>' +
      '                              <next>' +
      '                                <block type="delay_ms">' +
      '                                  <field name="DURATION">2000</field>' +
      '                                  <next>' +
      '                                    <block type="comment_block">' +
      '                                      <field name="COMMENT">Pengereman / Stop (Brake)</field>' +
      '                                      <next>' +
      '                                        <block type="motor_driver_shield">' +
      '                                          <field name="MOTOR_NUM">1</field>' +
      '                                          <field name="COMMAND">BRAKE</field>' +
      '                                          <field name="SPEED">0</field>' +
      '                                          <next>' +
      '                                            <block type="motor_driver_shield">' +
      '                                              <field name="MOTOR_NUM">2</field>' +
      '                                              <field name="COMMAND">BRAKE</field>' +
      '                                              <field name="SPEED">0</field>' +
      '                                              <next>' +
      '                                                <block type="delay_ms">' +
      '                                                  <field name="DURATION">1500</field>' +
      '                                                </block>' +
      '                                              </next>' +
      '                                            </block>' +
      '                                          </next>' +
      '                                        </block>' +
      '                                      </next>' +
      '                                    </block>' +
      '                                  </next>' +
      '                                </block>' +
      '                              </next>' +
      '                            </block>' +
      '                          </next>' +
      '                        </block>' +
      '                      </next>' +
      '                    </block>' +
      '                  </next>' +
      '                </block>' +
      '              </next>' +
      '            </block>' +
      '          </next>' +
      '        </block>' +
      '      </next>' +
      '    </block>' +
      '  </statement>' +
      '</block>' +
      '</xml>'
  }
];
