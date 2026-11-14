import { eq } from "drizzle-orm";
import { env } from "../lib/env.js";
import { hashPassword } from "../lib/password.js";
import { db, sqlite } from "./index.js";
import { users } from "./schema.js";

async function seed() {
  const email = env.seed.ownerEmail.toLowerCase();
  const existing = db.select().from(users).where(eq(users.email, email)).get();

  if (existing) {
    console.log(`El usuario dueño ya existe (${email}). Nada que hacer.`);
    return;
  }

  const passwordHash = await hashPassword(env.seed.ownerPassword);
  db.insert(users)
    .values({
      name: env.seed.ownerName,
      email,
      passwordHash,
      role: "owner",
      active: true,
    })
    .run();

  console.log("Usuario dueño creado:");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${env.seed.ownerPassword}`);
  console.log("Cambia esta contraseña después del primer login.");
}

seed()
  .catch((err) => {
    console.error("Error en el seed:", err);
    process.exitCode = 1;
  })
  .finally(() => sqlite.close());
