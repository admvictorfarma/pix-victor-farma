import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// Banco em memória (MVP)
// =======================
const paymentsDB = new Map();

// =======================
// Mercado Pago config
// =======================
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_API_BASE = 'https://api.mercadopago.com/v1';

// =======================
// Health check
// =======================
app.get('/', (req, res) => {
  res.send('API PIX Mercado Pago rodando 🚀');
});

// =======================
// Função auxiliar para chamar API do Mercado Pago
// =======================
async function createPayment(paymentData) {
  const response = await fetch(`${MP_API_BASE}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

async function getPayment(paymentId) {
  const response = await fetch(`${MP_API_BASE}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// =======================
// Criar pagamento PIX
// =======================
app.post('/pix', async (req, res) => {
  try {
    const { valor, descricao } = req.body;

    if (!valor || Number(valor) <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const result = await createPayment({
      transaction_amount: Number(valor),
      description: descricao || 'Pagamento PIX',
      payment_method_id: 'pix',
      payer: {
        email: 'jardelanalista@outlook.com'
      }
    });

    // 🔐 Salva no "banco"
    paymentsDB.set(result.id.toString(), {
      id: result.id,
      status: result.status,
      valor: result.transaction_amount,
      created_at: new Date()
    });

    res.json({
      id: result.id,
      status: result.status,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code || null,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64 || null
    });

  } catch (error) {
    console.error('Erro ao gerar PIX:', error?.message || error);
    res.status(500).json({ error: 'Erro ao gerar PIX' });
  }
});

// =======================
// Consultar status (AGORA PELO BACKEND)
// =======================
app.get('/status/:paymentId', async (req, res) => {
  const { paymentId } = req.params;

  try {
    const mpPayment = await getPayment(paymentId);

    // Atualiza no "banco"
    paymentsDB.set(paymentId, {
      id: mpPayment.id,
      status: mpPayment.status,
      valor: mpPayment.transaction_amount,
      created_at: new Date()
    });

    console.log(`📊 Consultando pagamento ${paymentId}: ${mpPayment.status}`);

    return res.json({
      id: mpPayment.id,
      status: mpPayment.status,
      valor: mpPayment.transaction_amount
    });
  } catch (error) {
    console.error('Erro ao consultar status:', error);
    return res.status(500).json({ error: 'Erro ao consultar status' });
  }
});

// =======================
// Webhook Mercado Pago
// =======================
app.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];

    if (!signature || !requestId) {
      return res.sendStatus(400);
    }

    const parts = signature.split(',');
    const ts = parts.find(p => p.startsWith('ts=')).split('=')[1];
    const hash = parts.find(p => p.startsWith('v1=')).split('=')[1];

    const manifest = `id:${requestId};ts:${ts};`;

    const hmac = crypto
      .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex');

    if (hmac !== hash) {
      console.warn('Webhook inválido');
      return res.sendStatus(401);
    }

    const paymentId = req.body?.data?.id?.toString();
    if (!paymentId) return res.sendStatus(200);

    const mpPayment = await getPayment(paymentId);

    // 🔄 Atualiza no "banco"
    if (paymentsDB.has(paymentId)) {
      paymentsDB.set(paymentId, {
        ...paymentsDB.get(paymentId),
        status: mpPayment.status
      });
    }

    console.log('📩 Webhook PIX:', {
      id: mpPayment.id,
      status: mpPayment.status,
      valor: mpPayment.transaction_amount
    });

    if (mpPayment.status === 'approved') {
      console.log('✅ PIX CONFIRMADO — pronto pra liberar acesso');
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('Erro no webhook:', error);
    res.sendStatus(500);
  }
});

// =======================
// Porta Render
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
