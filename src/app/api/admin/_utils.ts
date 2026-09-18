import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-server";

export function adminJson(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

export function adminError(error: unknown) {
  if (error instanceof AdminAuthError) return adminJson({ error: error.message }, { status: error.status });
  console.error("Admin inspection request failed:", error);
  return adminJson({ error: "관리자 데이터를 불러오지 못했습니다." }, { status: 500 });
}

export function parsePage(value: string | null, fallback = 1) {
  const page = Number(value ?? fallback);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 100000) : fallback;
}

export function parsePageSize(value: string | null, fallback = 20) {
  const pageSize = Number(value ?? fallback);
  return Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 50) : fallback;
}

export function parseUuid(value: string | null) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export function parseDate(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : value;
}
