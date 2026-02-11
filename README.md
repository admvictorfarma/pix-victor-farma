# API PIX Mercado Pago — Deploy no Render

Passos mínimos para publicar este `server.js` no Render usando as credenciais do Mercado Pago.

1) Inicializar repositório Git e enviar para GitHub (ou Git provider):

```bash
git init
git add .
git commit -m "Inicial: API PIX Mercado Pago"
# crie um repositório no GitHub e então:
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git branch -M main
git push -u origin main
```

2) No dashboard do Render:
- Clique em "New" → "Web Service".
- Conecte ao repo que você acabou de subir.
- Build command: `npm install`
- Start command: `npm start`

3) Defina as variáveis de ambiente no Render (Environment → Environment Variables):
- `MP_ACCESS_TOKEN` = seu access token do Mercado Pago
- `MP_WEBHOOK_SECRET` = seu webhook secret (usado para validar chamadas do MP)
- `PORT` (opcional) — o Render geralmente fornece automaticamente

4) Webhook no Mercado Pago:
- Aponte o webhook para `https://<seu-service>.onrender.com/webhook`.
- Configure no painel do Mercado Pago para enviar `x-signature` e `x-request-id` (o SDK/console do MP fornece esses headers).

5) Testes rápidos (local):

```bash
# instalar dependências
npm install

# rodar local (precisa do .env com MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET)
npm run dev
```

Observações de segurança e produção:
- Nunca comite seu `.env` com credenciais.
- Em produção, considere usar Redis/DB para persistência em vez de memória.
- Restrinja `CORS` e adicione `helmet`/rate-limiting se expor publicamente.

Se quiser, eu posso:
- (A) criar o repositório Git no seu GitHub e subir os arquivos (você precisa me autorizar ou me fornecer um token), ou
- (B) guiar passo-a-passo para criar o serviço no Render e configurar variáveis.
