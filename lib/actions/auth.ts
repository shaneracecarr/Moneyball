"use server";

import { signIn } from "@/auth";
import { signUpSchema, signInSchema } from "@/lib/validations/auth";
import { createUser, getUserByEmail } from "@/lib/db/queries";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

export async function signUpAction(formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
      name: formData.get("name"),
    };

    console.log("[Signup] Starting signup for:", rawData.email);

    const validatedData = signUpSchema.parse(rawData);

    // Check if user already exists
    console.log("[Signup] Checking if user exists...");
    const existingUser = await getUserByEmail(validatedData.email);
    console.log("[Signup] Existing user check result:", existingUser ? "found" : "not found");

    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    // Hash password
    console.log("[Signup] Hashing password...");
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    console.log("[Signup] Creating user in database...");
    const newUser = await createUser(validatedData.email, hashedPassword, validatedData.name);
    console.log("[Signup] User created:", newUser ? "success" : "failed");

    // Sign in the user
    console.log("[Signup] Signing in user...");
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });
    console.log("[Signup] Sign in complete");
  } catch (error) {
    console.error("[Signup] Error:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An error occurred during signup" };
  }

  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validatedData = signInSchema.parse(rawData);

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An error occurred during login" };
  }

  redirect("/dashboard");
}
