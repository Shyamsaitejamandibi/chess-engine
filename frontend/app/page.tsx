import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import Link from "next/link";
import Image from "next/image";
import {
  LiaChessKnightSolid,
  LiaChessPawnSolid,
  LiaChessQueenSolid,
  LiaChessRookSolid,
} from "react-icons/lia";

export default function ChessLandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <Link className="flex items-center justify-center" href="#">
          <LiaChessKnightSolid className="h-6 w-6" />
          <span className="sr-only">Chess Master</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            href="/game"
          >
            Play
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            href="#"
          >
            Learn
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            href="#"
          >
            Watch
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            href="#"
          >
            Community
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-16 lg:py-20 xl:py-28">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Master the Game of Kings
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Join our community of chess enthusiasts. Play, learn, and
                    improve your skills with Chess Master.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    href="/game"
                  >
                    Get Started
                  </Link>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    href="#"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
              <Image
                src="/unnamed.png"
                alt="Image"
                width="1920"
                height="1080"
                className="h-96 w-full object-cover dark:brightness-[0.2] dark:grayscale"
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-16 lg:py-20 ">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Features
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Discover why Chess Master is the ultimate platform for chess
                  enthusiasts
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <LiaChessPawnSolid className="mx-auto h-12 w-12" />
                <h3 className="text-xl font-bold">Play Anytime</h3>
                <p className="text-muted-foreground">
                  Challenge players from around the world or play against our
                  advanced AI opponents.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <LiaChessQueenSolid className="mx-auto h-12 w-12" />
                <h3 className="text-xl font-bold">Learn Strategies</h3>
                <p className="text-muted-foreground">
                  Access a vast library of tutorials, puzzles, and lessons from
                  grandmasters.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <LiaChessRookSolid className="mx-auto h-12 w-12" />
                <h3 className="text-xl font-bold">Join Tournaments</h3>
                <p className="text-muted-foreground">
                  Participate in daily, weekly, and monthly tournaments with
                  players of all skill levels.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-16 lg:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Join Our Community
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Sign up for our newsletter to receive chess tips, tournament
                  updates, and exclusive offers.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <form className="flex space-x-2">
                  <Input
                    className="max-w-lg flex-1"
                    placeholder="Enter your email"
                    type="email"
                  />
                  <Button type="submit">Subscribe</Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  By subscribing, you agree to our{" "}
                  <Link className="underline underline-offset-2" href="#">
                    Terms & Conditions
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          © 2023 Chess Master. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
