import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { textBatch, targetLang } = await req.json();

    if (!textBatch || textBatch.length === 0) {
      return NextResponse.json({ translatedBatch: [] });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a professional translator for AfriCart, an e-commerce platform in Nigeria.

CRITICAL RULES:
1. Translate EXACTLY what is written - do NOT change, paraphrase, or interpret the meaning
2. Translate the EXACT word used
3. Preserve all specific nouns, technical terms, and UI element names accurately
4. Do NOT translate: "AfriCart", brand names, product model numbers, or currency codes
5. Use natural, everyday ${targetLang} spoken in Nigeria (not formal/archaic language)
6. Return ONLY a JSON object: {"original english text": "exact translation"}
7. If you're unsure, keep the original English text

CONTEXT: This is for an e-commerce website UI, so translations must be:
- Accurate (same meaning as English)
- Natural (how Nigerians actually speak ${targetLang})
- Consistent (same term = same translation every time)`
          },
          {
            role: "user",
            content: `Translate these phrases into ${targetLang}. Return JSON only:\n${JSON.stringify(textBatch)}`
          }
        ],
        temperature: 0, // Lower temperature = more consistent/accurate
        response_format: { type: "json_object" } 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq Error:", data.error?.message);
      return NextResponse.json({ translatedBatch: textBatch });
    }

    let resultText = data.choices[0].message.content.trim();

    if (resultText.startsWith("```")) {
      resultText = resultText.replace(/^```json/, "").replace(/```$/, "").trim();
    }

    try {
      const parsed = JSON.parse(resultText);
      const translatedBatch = textBatch.map(original => parsed[original] || original);
      return NextResponse.json({ translatedBatch });
    } catch (parseError) {
      console.error("JSON Parsing Error:", resultText);
      return NextResponse.json({ translatedBatch: textBatch });
    }

  } catch (error) {
    console.error("Critical API Error:", error.message);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}