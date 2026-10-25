import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { Role } from "@prisma/client";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["ATTENDEE", "ORGANIZER"]).optional().default("ATTENDEE"),
  organizationName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(validated.password);

    // Prevent any client self-promotion to ADMIN
    const role: Role = validated.role === "ORGANIZER" ? Role.ORGANIZER : Role.ATTENDEE;

    const user = await prisma.user.create({
      data: {
        name: validated.name.trim(),
        email: validated.email.toLowerCase().trim(),
        passwordHash,
        role,
        ...(role === Role.ORGANIZER && validated.organizationName
          ? {
              organizations: {
                create: {
                  name: validated.organizationName.trim(),
                  slug:
                    validated.organizationName
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, "") +
                    "-" +
                    Math.floor(1000 + Math.random() * 9000),
                },
              },
            }
          : {}),
      },
      include: {
        organizations: true,
      },
    });

    // Generate session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizations: user.organizations,
      },
    });

    // Set HTTP-only secure cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
