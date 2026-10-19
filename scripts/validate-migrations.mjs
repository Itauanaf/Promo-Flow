import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const directory = join(process.cwd(), "supabase", "migrations");
const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
if (!files.length) throw new Error("No migrations found");
if (new Set(files.map((file) => file.slice(0, 14))).size !== files.length) throw new Error("Duplicate migration timestamps");

let combined = "";
for (const file of files) {
  const sql = await readFile(join(directory, file), "utf8");
  if (!/^begin;/im.test(sql) || !/commit;\s*$/im.test(sql)) throw new Error(`${file} must be transactional`);
  combined += `\n${sql}`;
}

const tables = [...combined.matchAll(/create table public\.(\w+)/gi)].map((match) => match[1]);
const dynamicBlock = combined.match(/foreach t in array array\[(.*?)\] loop execute format\('alter table public\.%I enable row level security'/is)?.[1] ?? "";
const dynamicTables = new Set([...dynamicBlock.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]));
for (const table of tables) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const explicit = new RegExp(`alter table public\\.${escaped} enable row level security`, "i").test(combined);
  if (!explicit && !dynamicTables.has(table)) throw new Error(`RLS not enabled for ${table}`);
}
console.log(`Validated ${files.length} ordered migrations and RLS for ${tables.length} public tables.`);
