import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { processCheckout, CheckoutError } from "@/lib/checkout";

const checkoutSchema = z.object({
  holdId: z.string().uuid("Invalid hold ID format."),
  idempotencyKey: z.string().min(8, "Idempotency key required.").max(64),
  simulateResult: z.enum(["SUCCESS", "FAILURE"]).default("SUCCESS"),
  paymentMethod: z.string().optional().default("UPI_SIMULATED"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to checkout." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = checkoutSchema.parse(body);

    const result = await processCheckout({
      holdId: validated.holdId,
      userId: session.userId,
      idempotencyKey: validated.idempotencyKey,
      simulateResult: validated.simulateResult,
      paymentMethod: validated.paymentMethod,
    });

    return NextResponse.json({
      success: true,
      isDuplicate: result.isDuplicate,
      order: result.order,
      tickets: result.tickets,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Invalid checkout request." },
        { status: 400 }
      );
    }
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error("Checkout execution error:", error);
    return NextResponse.json(
      { error: "Payment processing failed. Please check your reservation and try again." },
      { status: 500 }
    );
  }
}
