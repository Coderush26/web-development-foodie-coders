import { NextResponse } from "next/server";

import { verifyEmail } from "@/server/auth/flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const token = typeof formData?.get("token") === "string" ? String(formData.get("token")) : "";

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/verify-email?error=missing-token", request.url),
      303
    );
  }

  try {
    const result = await verifyEmail(token);

    if (!result) {
      return NextResponse.redirect(
        new URL(
          `/auth/verify-email?token=${encodeURIComponent(token)}&error=invalid-token`,
          request.url
        ),
        303
      );
    }

    return NextResponse.redirect(new URL("/auth/login?verified=1", request.url), 303);
  } catch (error) {
    console.error("Email verification failed.", error);
    return NextResponse.redirect(
      new URL(
        `/auth/verify-email?token=${encodeURIComponent(token)}&error=unavailable`,
        request.url
      ),
      303
    );
  }
}
