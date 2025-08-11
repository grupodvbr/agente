import { z } from "zod";
import { varejoFacil } from "./varejoFacil";

export function defineTools() {
  const defs = {
    getSalesSummary: {
      desc: "Resumo de vendas no Varejo Fácil por período e empresa.",
      schema: z.object({
        empresa: z.string(),
        inicio: z.string().describe("YYYY-MM-DD"),
        fim: z.string().describe("YYYY-MM-DD"),
        grupo: z.enum(["dia", "mes", "categoria"]).default("dia")
      })
    },
    getOrderDetail: {
      desc: "Detalhes de um pedido específico.",
      schema: z.object({ numeroPedido: z.string() })
    },
    getTopProducts: {
      desc: "Produtos mais vendidos no período.",
      schema: z.object({
        empresa: z.string(),
        inicio: z.string(),
        fim: z.string(),
        limite: z.number().int().min(1).max(100).default(10)
      })
    }
  };

  return {
    toOpenAITools() {
      return Object.entries(defs).map(([name, def]) => ({
        type: "function",
        name,
        description: def.desc,
        parameters: (def.schema as any).toJSON()
      }));
    }
  };
}

export async function runTool(name: string, args: any) {
  if (name === "getSalesSummary") return varejoFacil.getSalesSummary(args);
  if (name === "getOrderDetail")  return varejoFacil.getOrderDetail(args);
  if (name === "getTopProducts")  return varejoFacil.getTopProducts(args);
  throw new Error(`Tool desconhecida: ${name}`);
}