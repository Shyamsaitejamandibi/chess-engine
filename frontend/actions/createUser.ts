"use server";

import db from "@/lib/db";
import { randomUUID } from "crypto";

export const createUser = async (userId: string) => {
  const user = await db.user.create({
    data: {
      email: randomUUID(), // replace with actual email
      provider: "EMAIL", // replace with actual provider
    },
  });

  console.log("Created user", user);

  return user;
};
