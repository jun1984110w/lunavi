type LangCode = "vi" | "ko" | "en";

type TranslateResult = Partial<Record<LangCode, string>>;

export function hasGoogleTranslateApiKey() {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
}

export async function translateTextWithGoogle(params: {
  text: string;
  source: LangCode;
}): Promise<TranslateResult> {
  const { text, source } = params;
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY 환경 변수가 없습니다.");
  }

  const targets = (["vi", "ko", "en"] as const).filter((lang) => lang !== source);
  const result: TranslateResult = { [source]: text };

  // Google Translate API를 순차 호출해 각 언어 결과를 수집합니다.
  for (const target of targets) {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source,
          target,
          format: "text",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`번역 API 호출에 실패했습니다: ${errorText}`);
    }

    const json = (await response.json()) as {
      data?: { translations?: { translatedText: string }[] };
    };
    const translatedText = json.data?.translations?.[0]?.translatedText;

    if (!translatedText) {
      throw new Error("번역 결과를 찾지 못했습니다.");
    }

    result[target] = translatedText;
  }

  return result;
}
