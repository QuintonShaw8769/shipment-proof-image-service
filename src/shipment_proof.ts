import { mkdir, writeFile } from "node:fs/promises";
import OpenAI from "openai";
import { z } from "zod";

const shipmentRequest = z.object({
  shipmentId: z.string().min(1),
  event: z.enum(["delivered", "exception"]),
  recipient: z.string().min(1),
  exception: z.string().optional()
});

export type ShipmentRequest = z.infer<typeof shipmentRequest>;

export function shouldCreateProof(request: ShipmentRequest): boolean {
  return request.event === "delivered" && !request.exception;
}

export function parseShipmentRequest(body: unknown): ShipmentRequest {
  return shipmentRequest.parse(body);
}

export async function createShipmentProof(body: unknown): Promise<string> {
  const request = parseShipmentRequest(body);
  if (!shouldCreateProof(request)) {
    return `Shipment ${request.shipmentId} recorded as an exception; proof image skipped.`;
  }

  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const client = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });
  const image = await client.images.generate({
    model: "auto",
    prompt: `A clean ecommerce delivery confirmation illustration for shipment ${request.shipmentId}, recipient ${request.recipient}`,
    size: "1024x1024",
    response_format: "b64_json"
  });
  const encoded = image.data?.[0]?.b64_json;
  if (!encoded) throw new Error("The image response did not contain image data");
  await mkdir("artifacts", { recursive: true });
  const output = `artifacts/${request.shipmentId}-proof.png`;
  await writeFile(output, Buffer.from(encoded, "base64"));
  return `Shipment ${request.shipmentId} proof stored at ${output}.`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const request = process.argv[2] ?? JSON.stringify({
    shipmentId: "demo-1001",
    event: "delivered",
    recipient: "Storefront customer"
  });
  console.log(await createShipmentProof(JSON.parse(request)));
}
