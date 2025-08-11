import { NextRequest } from "next/server";
import OpenAI from "openai";
import { defineTools, runTool } from "./lib/tools";

export const config = { runtime: "edge" };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextRequest) {
  const { messages = [] } = await req.json().catch(() => ({ messages: [] }));

  const system = [{
    role: "system" as const,
    content:
      "Você é um agente comercial/financeiro do Grupo DV. Responda em PT-BR de forma objetiva. "      + "Quando precisar de dados, chame as ferramentas do Varejo Fácil. Cite período e empresa na resposta."
  }];

  const tools = defineTools().toOpenAITools();

  const first = await client.responses.create({
    model: "gpt-5",
    input: [...system, ...messages],
    tools
  });

  const toolCalls = first.output?.filter(p => p.type === "tool_call") || [];
  const toolOutputs: any[] = [];

  for (const call of toolCalls) {
    const anyCall = call as any;
    const result = await runTool(anyCall.name, anyCall.arguments || {});
    toolOutputs.push({
      role: "tool",
      tool_call_id: anyCall.id,
      content: JSON.stringify(result)
    });
  }

  const final = await client.responses.create({
    model: "gpt-5",
    input: [...system, ...messages, ...toolOutputs]
  });

  return new Response(JSON.stringify(final), {
    headers: { "content-type": "application/json" }
  });
}