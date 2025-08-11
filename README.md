# Agente Grupo DV (Vercel + GitHub)

## Variáveis de ambiente (Vercel → Settings → Environment Variables)
- OPENAI_API_KEY
- VF_BASE_URL
- VF_API_TOKEN

## Desenvolver local
```bash
npm i -g vercel
npm i
vercel dev
```

## Deploy
- Conecte o repo na Vercel. A cada `git push`, sai um Preview.
- Promova para produção pelo dashboard ou merge no `main`.
