// x402 v2 payment middleware for Moodring.
// Returns 402 + PAYMENT-REQUIRED header (base64-encoded JSON) per the v2 spec.
// https://docs.x402.org/core-concepts/http-402
//
// v2 spec requirements (EVM `exact` scheme):
//   top-level: x402Version, error, resource, accepts
//   accepts[]: scheme, network, amount (NOT maxAmountRequired), asset, payTo,
//              maxTimeoutSeconds, extra
//   extra: { name (EIP-712 token name), version (EIP-712 domain version) }

const NETWORK = 'eip155:196'; // X Layer
const ASSET = '0x779Ded0c9e10eA8507B6c1e8ed4F2944A3A1A3dC'; // USDT0 on X Layer
const ASSET_DECIMALS = 6;
const ASSET_NAME = 'USD₮0';
const ASSET_VERSION = '1';

export function x402({ price, description }) {
  return function x402Middleware(req, res, next) {
    const paymentHeader = req.headers['payment-signature'];

    // No payment provided — return 402 challenge
    if (!paymentHeader) {
      const challenge = {
        x402Version: 2,
        error: 'PAYMENT-SIGNATURE header is required',
        resource: {
          url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          description,
          mimeType: 'application/json',
        },
        accepts: [
          {
            scheme: 'exact',
            network: NETWORK,
            amount: priceString(price),
            asset: ASSET,
            payTo: process.env.RECEIVE_ADDRESS,
            maxTimeoutSeconds: 60,
            extra: {
              name: ASSET_NAME,
              version: ASSET_VERSION,
            },
          },
        ],
      };
      const encoded = Buffer.from(JSON.stringify(challenge)).toString('base64');
      res.set('PAYMENT-REQUIRED', encoded);
      res.status(402).json(challenge);
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
