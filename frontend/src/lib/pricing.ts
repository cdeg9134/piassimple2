import { z } from "zod";

export const TICKET_SERVICES = [
  "Wax & Sharpen",
  "Sharpen",
  "Wax",
  "Base Grind",
  "Adjustment",
  "Full Tune-Up",
];

export const SERVICE_LIST_PRICES: Record<string, number> = {
  "Wax & Sharpen": 40,
  "Sharpen": 20,
  "Wax": 20,
  "Base Grind": 20,
  "Adjustment": 20,
  "Full Tune-Up": 60,
};

export function calculateServicesSubtotal(
  services: string[],
  customServices: { price: number }[],
  skiOwnership: string | null,
  bindingInstallFree: boolean,
  ptexPrice: number | null,
  expressService: boolean,
  serviceAdjustments: Record<string, number> = {}
) {
  let subtotal = 0;

  const hasWax = services.includes("Wax");
  const hasSharpen = services.includes("Sharpen");
  const hasAdjust = services.includes("Adjustment");
  const hasWaxAndSharpen = services.includes("Wax & Sharpen") || (hasWax && hasSharpen);

  if (hasWaxAndSharpen && hasAdjust) {
    subtotal += skiOwnership === "store-owned" ? 40 : 60;
  } else if (hasWaxAndSharpen) {
    subtotal += 40;
    if (hasAdjust && !bindingInstallFree) subtotal += 20;
  } else {
    if (hasWax) subtotal += 20;
    if (hasSharpen) subtotal += 20;
    if (hasAdjust && !bindingInstallFree) subtotal += 20;
  }

  if (services.includes("Base Grind")) subtotal += 20;
  if (services.includes("Full Tune-Up")) subtotal += 60;

  // Per-service price adjustments (only for selected services)
  for (const svc of services) {
    const adj = serviceAdjustments[svc] ?? 0;
    subtotal += adj;
  }

  // Custom services
  for (const cs of customServices) {
    subtotal += cs.price;
  }

  if (ptexPrice) {
    subtotal += ptexPrice;
  }

  if (expressService) {
    subtotal *= 2;
  }

  return subtotal;
}

// Keep old name as alias for backward compatibility
export const calculateSubtotal = calculateServicesSubtotal;

export function calculateTotal(subtotal: number, taxRate: number, taxExempt: boolean) {
  if (taxExempt) return subtotal;
  return subtotal + subtotal * (taxRate / 100);
}
