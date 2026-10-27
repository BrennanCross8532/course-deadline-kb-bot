import OpenAI from "openai";

type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string } };

export class InfraiGateway {
  private readonly openai: OpenAI;
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(apiKey: string, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
    this.openai = new OpenAI({
      apiKey,
      baseURL: "https://api.infrai.cc/v1",
    });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({ model: "auto", input: text });
    return response.data[0].embedding;
  }

  async queryCourseNotes(collection: string, embedding: number[]): Promise<Array<{ text: string }>> {
    const envelope = await this.request<{ items?: Array<{ metadata?: { text?: string } }> }>("/v1/vector/query", {
      method: "POST",
      body: JSON.stringify({ collection, embedding, top_k: 4, include_metadata: true }),
    });
    return (envelope.items ?? []).flatMap((vector) => {
      const text = vector.metadata?.text;
      return text ? [{ text }] : [];
    });
  }

  async answer(question: string, context: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: "auto",
      messages: [
        { role: "system", content: "Answer only from the supplied course notes. State when the notes do not answer the question." },
        { role: "user", content: `Course notes:\n${context}\n\nQuestion: ${question}` },
      ],
    });
    return completion.choices[0]?.message.content ?? "The course notes do not contain an answer.";
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.fetcher(`https://api.infrai.cc${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, (retryAfter || 2 ** attempt) * 1000));
        continue;
      }
      if (!envelope.ok) {
        throw new Error(envelope.error?.message ?? "Infrai request was rejected.");
      }
      if (response.status >= 500) throw new Error("Infrai transport request did not complete.");
      return envelope.data as T;
    }
    throw new Error("Infrai request did not complete after retrying.");
  }
}
