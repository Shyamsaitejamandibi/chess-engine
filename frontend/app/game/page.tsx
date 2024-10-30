import { createUser } from "@/actions/createUser";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function Login() {
  const { userId } = await auth();

  if (userId) {
    const user = await createUser(userId);
    if (user) {
      return (
        <Link
          href="/game/random"
          className="text-sm text-white font-medium hover:underline underline-offset-4"
        >
          Play a random game
        </Link>
      );
    }
  }

  return (
    <Link
      href="/sign-in"
      className="text-sm text-white font-medium hover:underline underline-offset-4"
    >
      Sign in to play
    </Link>
  );
}
