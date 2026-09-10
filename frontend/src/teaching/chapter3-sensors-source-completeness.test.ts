import { describe, expect, it } from 'vitest';
import { CHAPTER_3_SENSOR_SLIDES } from './lesson-content-chapter3-sensors';
import { CHAPTER_3_SENSOR_VISUAL_IDS } from './Chapter3SensorVisuals';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';

const byId = Object.fromEntries(CHAPTER_3_SENSOR_SLIDES.map(slide => [slide.id, slide]));

describe('Hodder Chapter 3 sensors and control source completeness', () => {
  it('covers printed pp.84–89 with source-specific scenes inside the complete Chapter 3 build', () => {
    expect(CHAPTER_3_SENSOR_SLIDES).toHaveLength(6);
    expect(CHAPTER_3_SENSOR_SLIDES.flatMap(slide => slide.sourcePages ?? [])).toEqual([84, 85, 86, 87, 88, 89]);
    expect(CHAPTER_3_FINAL.sourceNote).toContain('pp.68–106');
    expect(CHAPTER_3_FINAL.sourceNote).toContain('complete chapter range');
  });

  it('locks Figure 3.19 ADC/DAC and actuator terminology', () => {
    expect(byId['h3-312-sensors-adc-dac'].sourceElements).toEqual(expect.arrayContaining([
      'Figure 3.19 Converting analogue data into digital data',
      'sensor', 'ADC', 'DAC', 'actuator', 'relay', 'solenoid', 'motor', 'positive feedback',
    ]));
    expect(JSON.stringify(byId['h3-312-sensors-adc-dac'])).toContain('constantly changing');
    expect(JSON.stringify(byId['h3-312-sensors-adc-dac'])).toContain('discrete digital values');
  });

  it('preserves Table 3.7 sensor families and applications', () => {
    const text = JSON.stringify(byId['h3-312-sensor-applications']);
    for (const term of ['temperature', 'moisture/humidity', 'light', 'infrared/motion', 'pressure', 'acoustic/sound', 'gas (O₂ or CO₂)', 'pH', 'magnetic field']) {
      expect(text).toContain(term);
    }
    expect(byId['h3-312-sensor-applications'].sourceElements).toContain('Table 3.7 Common sensors and examples of applications');
  });

  it('locks the monitoring/control split, feedback loop and Table 3.8', () => {
    expect(byId['h3-312-monitor-control'].sourceElements).toEqual(expect.arrayContaining([
      'Figure 3.20 Sensors for monitoring and controlling systems',
      'Table 3.8 Examples of monitoring and control applications of sensors',
      'feedback loop',
    ]));
    const text = JSON.stringify(byId['h3-312-monitor-control']);
    expect(text).toContain('warning message or alarm');
    expect(text).toContain('valves, motors and other devices');
    expect(text).toContain('output affects the next sensor inputs');
  });

  it('preserves the Hodder ABS control sequence', () => {
    const text = JSON.stringify(byId['h3-312-abs-control']);
    for (const phrase of ['other three wheels', 'braking pressure', 'several times a second', 'judder']) {
      expect(text).toContain(phrase);
    }
    expect(byId['h3-312-abs-control'].sourceElements).toContain('Figure 3.21 Sensors on a typical modern car');
  });

  it('keeps Activity 3A and Extensions 3E–3F visible rather than reducing them to tags', () => {
    const practice = JSON.stringify(byId['h3-31-activity-3a-3e']);
    for (const phrase of ['three differences between RAM and ROM', 'magnetic, optical and solid-state', 'laser printer and an inkjet printer', '3D replica', 'street light', 'pressing H', 'mechanical and optical mice', 'USB-cable with wireless']) {
      expect(practice).toContain(phrase);
    }
    expect(JSON.stringify(byId['h3-32-logic-gates-intro'])).toContain('QLED and OLED');
  });

  it('locks the 3.2 entry vocabulary and all six Figure 3.22 gate names', () => {
    const text = JSON.stringify(byId['h3-32-logic-gates-intro']);
    for (const term of ['Logic gates', 'logic circuit', 'truth table', 'Boolean algebra', 'NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR', '2² = 4', '2³ = 8']) {
      expect(text).toContain(term);
    }
    expect(CHAPTER_3_SENSOR_VISUAL_IDS).toEqual(expect.arrayContaining([
      'h3-312-sensors-adc-dac',
      'h3-312-sensor-applications',
      'h3-312-monitor-control',
      'h3-312-abs-control',
      'h3-32-logic-gates-intro',
    ]));
  });
});
