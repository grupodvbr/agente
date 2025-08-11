const BASE_URL = process.env.VF_BASE_URL!;
const TOKEN = process.env.VF_API_TOKEN!;

async function vf(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Varejo Fácil ${res.status}: ${txt}`);
  }
  return res.json();
}

export const varejoFacil = {
  async getSalesSummary({ empresa, inicio, fim, grupo = "dia" }: any) {
    return vf(`/v1/sales?company=${encodeURIComponent(empresa)}&start=${inicio}&end=${fim}&group_by=${grupo}`);
  },
  async getOrderDetail({ numeroPedido }: any) {
    return vf(`/v1/orders/${encodeURIComponent(numeroPedido)}`);
  },
  async getTopProducts({ empresa, inicio, fim, limite = 10 }: any) {
    return vf(`/v1/top-products?company=${encodeURIComponent(empresa)}&start=${inicio}&end=${fim}&limit=${limite}`);
  }
};