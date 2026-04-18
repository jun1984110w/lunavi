import { NextResponse } from "next/server";
import { translateTextWithGoogle } from "@/lib/translate";

type TranslateRequest = {
  text: string;
  source: "vi" | "ko" | "en";
};

export async function POST(request: Request) {
  const body = (await request.json()) as TranslateRequest;
  const text = body?.text?.trim();
  const source = body?.source;

  if (!text || !source) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const translations = await translateTextWithGoogle({ text, source });
    return NextResponse.json({ translations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "번역 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
