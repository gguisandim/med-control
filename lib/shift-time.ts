import type { ShiftType } from "./types";

export const DAY_START_MINUTES = 7 * 60 + 30;
export const NIGHT_START_MINUTES = 19 * 60 + 30;

export function timezone() {
  return process.env.APP_TIMEZONE || "America/Belem";
}

function partsFor(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function isoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

export function addDays(date: string, amount: number) {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + amount);
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(
    utc.getUTCDate(),
  ).padStart(2, "0")}`;
}

function previousDate(date: string) {
  return addDays(date, -1);
}

export function getCurrentShift(now = new Date()): { shiftType: ShiftType; shiftDate: string } {
  const p = partsFor(now);
  const today = isoDate(p.year, p.month, p.day);
  const minutes = p.hour * 60 + p.minute;

  if (minutes >= NIGHT_START_MINUTES) {
    return { shiftType: "night", shiftDate: today };
  }

  if (minutes < DAY_START_MINUTES) {
    return { shiftType: "night", shiftDate: previousDate(today) };
  }

  return { shiftType: "day", shiftDate: today };
}

/**
 * Converts a wall-clock time in APP_TIMEZONE to an ISO instant without relying
 * on the device/browser timezone. The second pass handles timezone offset changes.
 */
export function localDateTimeToIso(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Data ou horário inválido.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  function offsetAt(epochMs: number) {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(epochMs));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(p.find((x) => x.type === type)?.value || 0);
    const represented = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return represented - epochMs;
  }

  let candidate = wallAsUtc - offsetAt(wallAsUtc);
  candidate = wallAsUtc - offsetAt(candidate);
  return new Date(candidate).toISOString();
}

export function administrationIsoForShift(shiftDate: string, shiftType: ShiftType, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Horário inválido.");
  }

  const minutes = hour * 60 + minute;
  let calendarDate = shiftDate;

  if (shiftType === "night") {
    if (minutes < DAY_START_MINUTES) calendarDate = addDays(shiftDate, 1);
    else if (minutes < NIGHT_START_MINUTES) {
      throw new Error("O horário informado está fora do intervalo do turno da noite.");
    }
  } else if (minutes < DAY_START_MINUTES || minutes >= NIGHT_START_MINUTES) {
    throw new Error("O horário informado está fora do intervalo do turno do dia.");
  }

  return localDateTimeToIso(calendarDate, time);
}

export function formatShiftDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone(),
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone(),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function shiftLabel(type: ShiftType) {
  return type === "day" ? "DIA" : "NOITE";
}
