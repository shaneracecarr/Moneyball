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

    const validatedData = signUpSchema.parse(rawData);

    // Check if user already exists
    const existingUser = await getUserByEmail(validatedData.email);
    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    await createUser(validatedData.email, hashedPassword, validatedData.name);

    // Sign in the user
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });
  } catch (error) {
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
