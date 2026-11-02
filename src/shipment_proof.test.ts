import test from "node:test";
import assert from "node:assert/strict";
import { parseShipmentRequest, shouldCreateProof } from "./shipment_proof.ts";

test("an exception event is recorded without creating a delivery proof", () => {
  const request = parseShipmentRequest({
    shipmentId: "order-42",
    event: "exception",
    recipient: "Checkout customer",
    exception: "Address review"
  });
  assert.equal(shouldCreateProof(request), false);
});

test("a delivered event creates the proof decision", () => {
  const request = parseShipmentRequest({
    shipmentId: "order-43",
    event: "delivered",
    recipient: "Checkout customer"
  });
  assert.equal(shouldCreateProof(request), true);
});
