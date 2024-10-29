import { PrismaClient, AuthProvider } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a guest user
  const guestUser = await prisma.user.create({
    data: {
      username: null, // Since the user is a guest, no username
      name: "Guest", // Default name for the guest user
      email: "hello@gmail.com",
      provider: AuthProvider.EMAIL, // Assuming LOCAL as the provider for guests
      password: null, // No password for guest users
      lastLogin: new Date(), // Mark the guest's login time
    },
  });
  const guestUser2 = await prisma.user.create({
    data: {
      username: null, // Since the user is a guest, no username
      name: "Guest2", // Default name for the guest user
      email: "guest",
      provider: AuthProvider.EMAIL, // Assuming LOCAL as the provider for guests
      password: null, // No password for guest users
      lastLogin: new Date(), // Mark the guest's login time
    },
  });
  console.log({ guestUser });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
