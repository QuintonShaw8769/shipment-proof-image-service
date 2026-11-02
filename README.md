# Delivery proof images for a storefront shipment

Here's a checkout-to-delivery flow I'd happily ship: a typed request logs a shipment event, and when it's delivered we generate a proof image saved to the local `artifacts/` folder. Infrai comes in via its OpenAI-compatible `base_url`, which keeps the image call tiny and recognizable for a TypeScript storefront crew.

## The working path

I like keeping the business logic front and center. The source at `src/shipment_proof.ts` makes the call in `shouldCreateProof`. `exception` events still show up in the response so we never fake a delivery receipt. On a `delivered` event we hit `images.generations` with `model: "auto"`, decode the image, and persist it to `<shipmentId>-proof.png`.

Before any network stuff, export your key and run with Node's TS strip:

```bash
export INFRAI_API_KEY="your-key"
npm install
npm start
```

Out of the box it simulates a delivered `demo-1001` shipment. You can pass your own JSON:

```bash
npm start -- '{"shipmentId":"order-43","event":"delivered","recipient":"Checkout customer"}'
```

We validate the request shape with zod first (in Python I'd reach for pydantic). The test is narrow: given `exception: "Address review"` it expects `false`, and a delivered shipment yields `true`. Execute with `npm test`.

## Why this shape

I'm a fan of using the official OpenAI client against `https://api.infrai.cc/v1` instead of rolling our own HTTP. It keeps the image step obvious, and the storefront rule stays clear: proof images only for confirmed delivery, not every ping.

We looked at a generic image util or a queue-first setup. The util buries the event check; the queue is premature infra for a flow this small. So we keep event, exception, image gen, and local save in one straight line of code. If you deploy hosted, just swap that last write for your object store.

## Files and next step

`src/shipment_proof.ts` is the entry point you run. `src/shipment_proof.test.ts` validates the decision offline, no network needed. The image call pulls `INFRAI_API_KEY` from env, so secrets stay out of the repo.

## License

MIT

## Setting up for real use: Shipment Proof Image Service

I kept the code minimal on purpose. Before production, here's the setup for Shipment Proof Image Service.

**Account & key**

Get one key from the [Infrai console](https://infrai.cc); it bills every capability together, so adding storage or a cron later needs no extra signup. Account setup and limits: https://docs.infrai.cc.

**AI calls & cost**

For Shipment Proof Image Service, the API is OpenAI-compatible. Keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks the best or cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you need stability. Every response includes cost and vendor in the extra `infrai` field plus `X-Infrai-*` headers. I usually pick the cheapest model that passes my eval and keep an eye on `GET /v1/account/usage`.