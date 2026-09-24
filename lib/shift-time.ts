import type { ShiftType } from "./types";

const DAY_START_MINUTES = 7 * 60 + 30;
const NIGHT_START_MINUTES = 19 * 60 + 30;

function timezone() {
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

function previousDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(
    utc.getUTCDate(),
  ).padStart(2, "0")}`;
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
