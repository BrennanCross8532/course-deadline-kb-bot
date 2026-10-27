import { createServer } from "node:http";
import { z } from "zod";
import { decideDeadline } from "./deadline_decision.js";
import { InfraiGateway } from "./infrai_gateway.js";

const requestSchema = z.object({
  question: z.string().min(1),
  courseCollection: z.string().min(1),
  dueAt: z.string().datetime(),
  submittedAt: z.string().datetime(),
});

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the course support route.");
const infrai = new InfraiGateway(apiKey);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/course-support") {
    response.writeHead(404).end();
    return;
  }
  const body = await new Promise<string>((resolve, reject) => {
    let text = "";
    request.on("data", (chunk) => { text += chunk; });
    request.on("end", () => resolve(text));
    request.on("error", reject);
  });
  const parsed = requestSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Invalid course support request." }));
    return;
  }
  try {
    const input = parsed.data;
    const embedding = await infrai.embed(input.question);
    const notes = await infrai.queryCourseNotes(input.courseCollection, embedding);
    const answer = await infrai.answer(input.question, notes.map((note) => note.text).join("\n\n"));
    const deadline = decideDeadline(new Date(input.dueAt), new Date(input.submittedAt));
    response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ answer, deadline }));
  } catch (error) {
    response.writeHead(422, { "Content-Type": "application/json" }).end(JSON.stringify({ error: (error as Error).message }));
  }
}).listen(3000, () => console.log("Course support route listening on http://localhost:3000"));
