# Backend API Reference

## Overview

The backend provides REST APIs for stablecoin lifecycle management, event indexing, and compliance operations.

## Endpoints

### Health

```
GET /health
```

Returns service health status.

### Mint/Burn Service

```
POST /api/v1/mint
Content-Type: application/json

{
  "recipient": "<pubkey>",
  "amount": 1000000,
  "reference": "mint-request-001"
}

Response:
{
  "status": "completed",
  "signature": "<tx_signature>",
  "amount": 1000000,
  "recipient": "<pubkey>"
}
```

```
POST /api/v1/burn
Content-Type: application/json

{
  "amount": 500000,
  "from": "<token_account>",
  "reference": "burn-request-001"
}
```

### Supply

```
GET /api/v1/supply

Response:
{
  "totalMinted": 10000000000,
  "totalBurned": 500000000,
  "circulatingSupply": 9500000000,
  "decimals": 6
}
```

### Compliance (SSS-2)

```
POST /api/v1/compliance/blacklist
Content-Type: application/json

{
  "address": "<pubkey>",
  "reason": "OFAC SDN match",
  "reference": "compliance-001"
}
```

```
DELETE /api/v1/compliance/blacklist/:address
```

```
GET /api/v1/compliance/blacklist/:address

Response:
{
  "blacklisted": true,
  "reason": "OFAC SDN match",
  "blacklistedAt": "2024-01-01T00:00:00Z",
  "blacklistedBy": "<pubkey>"
}
```

```
POST /api/v1/compliance/seize
Content-Type: application/json

{
  "from": "<token_account>",
  "treasury": "<treasury_account>",
  "reference": "seize-001"
}
```

### Events

```
GET /api/v1/events?type=mint&limit=50&offset=0

Response:
{
  "events": [
    {
      "type": "TokensMinted",
      "data": { ... },
      "signature": "<tx>",
      "slot": 12345,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### Webhooks

```
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://your-service.com/webhook",
  "events": ["mint", "burn", "blacklist_add", "seize"],
  "secret": "your-webhook-secret"
}
```

```
GET /api/v1/webhooks
DELETE /api/v1/webhooks/:id
```

## Authentication

All mutating endpoints require authentication via signed Solana messages:

```
Authorization: Bearer <base58_signed_message>
```

The backend verifies that the signer has the required role for the operation.

## Docker

```bash
cd backend
docker compose up

# Services:
# - API server: http://localhost:3000
# - Event indexer: runs as background worker
# - Health check: http://localhost:3000/health
```

## Environment Variables

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=<sss_token_program_id>
STABLECOIN_MINT=<mint_address>
PORT=3000
LOG_LEVEL=info
WEBHOOK_SECRET=<secret>
```
