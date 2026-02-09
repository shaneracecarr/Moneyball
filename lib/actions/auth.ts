"use server";

import { createClient } from "@/lib/supabase/server";
import { signUpSchema, signInSchema } from "@/lib/validations/auth";
import { createUserProfile, getUserById } from "@/lib/db/queries";
import { redirect } from "next/navigation";

export async function signUpAction(formData: FormData) {
  const supabase = createClient();

  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
      name: formData.get("name"),
    };

    console.log("[Signup] Starting signup for:", rawData.email);

    const validatedData = signUpSchema.parse(rawData);

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          name: validatedData.name || null,
        },
      },
    });

    if (error) {
      console.error("[Signup] Supabase error:", error.message);
      if (error.message.includes("already registered")) {
        return { error: "User with this email already exists" };
      }
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "Failed to create user" };
    }

    console.log("[Signup] Supabase user created:", data.user.id);

    // Create a profile in our users table (for foreign key relationships)
    try {
      await createUserProfile(
        data.user.id,
        validatedData.email,
        validatedData.name
      );
      console.log("[Signup] Profile created in users table");
    } catch (profileError) {
      console.error("[Signup] Profile creation error:", profileError);
      // Don't fail signup if profile creation fails - we can sync later
    }
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
  const supabase = createClient();

  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validatedData = signInSchema.parse(rawData);

    const { error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      console.error("[SignIn] Supabase error:", error.message);
      return { error: "Invalid email or password" };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An error occurred during login" };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
