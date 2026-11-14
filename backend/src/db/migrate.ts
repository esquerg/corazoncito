import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./index.js";

console.log("Aplicando migraciones…");
migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migraciones aplicadas correctamente.");
sqlite.close();
