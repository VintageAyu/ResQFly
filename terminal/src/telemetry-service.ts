// =============================================================================
// RESQFLY CONSOLE — SIMULATED TELEMETRY SERVICE (TypeScript Port)
// =============================================================================
// Generates realistic demo telemetry data that mimics MAVLink packets.
// Provides smooth wave-based simulation of altitude, speed, pitch, roll, etc.
// =============================================================================

import type { TelemetryData } from './types';

export class TelemetryService {
  data: TelemetryData;
  private startTime: number;

  constructor() {
    this.startTime = performance.now() / 1000;
    this.data = {
      alt: 142.8,
      alt_msl: 142.8,
      speed: 14.6,
      vspeed: 0.4,
      pitch: 0.0,
      roll: 0.0,
      yaw: 0.0,
      heading: 42.0,
      lat: 37.774921,
      lon: -122.419416,
      satellites: 18,
      gps_fix: '3D FIX',
      battery_pct: 87,
      volts: 23.4,
      amps: 32.8,
      battery_temp: 34.0,
      mah_drawn: 1420,
      mode: 'MANUAL LOITER',
      armed: false,
      rssi: -64,
      snr: 29.4,
      latency: 14,
      loss: 0.02,
      throttle: 0,
      link_source: 'SIMULATION',
      is_live: false,
    };
  }

  update(): void {
    const t = performance.now() / 1000 - this.startTime;

    // Realistic wave-based simulation
    this.data.pitch = Math.round(Math.sin(t * 1.5) * 3.5 * 10) / 10;
    this.data.roll = Math.round(Math.cos(t * 1.8) * 2.8 * 10) / 10;
    this.data.yaw = (42 + Math.sin(t * 0.3) * 15 + 360) % 360;
    this.data.heading = this.data.yaw;
    this.data.alt = Math.round((142.8 + Math.sin(t * 0.5) * 1.2) * 10) / 10;
    this.data.alt_msl = this.data.alt;
    this.data.speed = Math.round((14.6 + Math.cos(t * 0.8) * 0.7) * 10) / 10;
    this.data.vspeed = Math.round(Math.cos(t * 0.5) * 0.5 * 10) / 10;

    // Battery slowly drains
    this.data.battery_pct = Math.max(0, 87 - Math.floor(t / 60));
    this.data.volts = 23.4 - (t / 600) * 0.5;
    this.data.amps = 32.8 + Math.sin(t * 2) * 2;
    this.data.mah_drawn = 1420 + Math.floor(t * 0.8);

    // GPS
    this.data.lat = 37.774921 + Math.sin(t * 0.1) * 0.0001;
    this.data.lon = -122.419416 + Math.cos(t * 0.1) * 0.0001;
    this.data.satellites = 18 + Math.floor(Math.sin(t * 0.2) * 2);

    // RF
    this.data.rssi = -64 + Math.floor(Math.sin(t * 0.5) * 5);
    this.data.snr = 29.4 + Math.sin(t * 0.7) * 1.5;
    this.data.latency = 14 + Math.floor(Math.random() * 4);
    this.data.loss = Math.max(0, 0.02 + Math.sin(t * 0.3) * 0.01);
    this.data.throttle = Math.floor(50 + Math.sin(t * 1.2) * 15);
  }
}
