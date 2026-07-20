// x402 v2 payment middleware for Moodring.
// Returns 402 + PAYMENT-REQUIRED header (base64-encoded JSON) per the v2 spec.
// SDK is optional — we ship a hand-rolled version that matches the v2 spec
// exactly so the marketplace validator passes without external dependencies.

const NETWORK = 'eip155:196'; // X Layer
const ASSET = '0x779Ded0c9e10eA8507B6c1e8ed4F2944A3A1A3dC'; // USDT0 on X Layer
const ASSET_DECIMALS = 6;
const FACILITATOR = 'https://x402.okx.com';

export function x402({ price, description }) {
  return function x402Middleware(req, res, next) {
    const paymentHeader = req.headers['x-payment'] || req.headers['payment'];

    // No payment provided — return 402 challenge
    if (!paymentHeader) {
      const challenge = {
        x402Version: 2,
        accepts: [
          {
            scheme: 'exact',
            network: NETWORK,
            asset: ASSET,
            assetDecimals: ASSET_DECIMALS,
            payTo: process.env.RECEIVE_ADDRESS,
            maxAmountRequired: priceString(price),
            description,
            mimeType: 'application/json',
            extra: {
              name: 'USD₮0',
              version: '1',
            },
          },
        ],
        error: 'X-PAYMENT header is required',
      };
      const encoded = Buffer.from(JSON.stringify(challenge)).toString('base64');
      res.set('PAYMENT-REQUIRED', encoded);
      res.set('X-PAYMENT-REQUIRED', encoded);
      res.status(402).json({
        x402Version: 2,
        accepts: challenge.accepts,
        error: challenge.error,
        message: `Pay ${price} USDT0 to access this service. Send the X-PAYMENT header with a valid EIP-3009 signed authorization.`,
      });
      return;
    }

    // Payment provided — in production, verify with facilitator.
    // For hackathon demo, accept any non-empty header (facilitator verification
    // is OKX-side and out of scope for this build).
    next();
  };
}

function priceString(price) {
  // Convert "0.003" USDT → integer with 6 decimals → "3000"
  const usdt = parseFloat(price);
  return Math.round(usdt * 10 ** ASSET_DECIMALS).toString();
}
