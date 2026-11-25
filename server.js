require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Payout endpoint called by your frontend
app.post('/api/withdraw', async (req, res) => {
  const { phone, amount, command_id } = req.body;

  // Basic validation
  const cleanedPhone = String(phone || '').trim();
  const numericAmount = Number(amount);
  const allowedCommands = ['BusinessPayment', 'SalaryPayment', 'PromotionPayment'];
  const selectedCommand = allowedCommands.includes(command_id) ? command_id : 'BusinessPayment';

  if (!/^(07|01)\d{8}$/.test(cleanedPhone)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit Kenyan phone number (e.g., 0712345678).' });
  }

  if (!numericAmount || numericAmount < 10) {
    return res.status(400).json({ error: 'Enter a valid amount (minimum KES 10).' });
  }

  try {
    const response = await fetch('https://www.printpay.site/b2c/payout/withdraw', {
      method: 'POST',
      headers: {
        'X-Wallet-ID': process.env.PRINTPAY_WALLET_ID,
        'X-Security-Credential': process.env.PRINTPAY_SECURITY_CREDENTIAL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command_id: selectedCommand,
        phone: cleanedPhone,
        amount: numericAmount
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Payout request rejected by PrintPay.',
        details: data
      });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Withdrawal error:', err);
    return res.status(500).json({ error: 'Failed to connect to PrintPay API.' });
  }
});

// 2. Optional Webhook endpoint to receive final M-Pesa B2C confirmation from PrintPay
app.post('/api/webhook/result', (req, res) => {
  console.log('PrintPay B2C Result Webhook:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
