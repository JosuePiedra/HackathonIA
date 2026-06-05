export const LLM_PROVIDER: "anthropic" | "gemini" =
  (process.env.LLM_PROVIDER as "anthropic" | "gemini") ?? "gemini";

export interface GenerateOptions {
  system?: string;
  user: string;
  maxTokens?: number;
  fast?: boolean;
}

export async function generateText(opts: GenerateOptions): Promise<string> {
  const { system, user, maxTokens = 1024 } = opts;

  if (LLM_PROVIDER === "gemini") {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = system ? `${system}\n\n${user}` : user;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    return result.response.text();
  }

  // Anthropic
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const modelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const msg = await client.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: user }],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}
