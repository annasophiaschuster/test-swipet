/**
 * recompress-images.ts  (CommonJS / Node --experimental-strip-types)
 *
 * Komprimiert alle Bilder in Supabase Storage (pet-photos + avatars)
 * mit sharp und überschreibt sie in-place mit JPEG (Option A).
 *
 * Ausführen aus dem Projekt-Root:
 *   node --experimental-strip-types scripts/recompress-images.ts --dry-run
 *   node --experimental-strip-types scripts/recompress-images.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const path     = require("path")     as typeof import("path");
const fs       = require("fs")       as typeof import("fs");
const readline = require("readline") as typeof import("readline");

// Eigene node_modules (ohne iceberg-js Abhängigkeit aus supabase-js 2.99)
const M = __dirname + "/node_modules";
const dotenvMod               = require(M + "/dotenv") as typeof import("dotenv");
const sharpMod                = require(M + "/sharp")  as typeof import("sharp");
const { createClient }        = require(M + "/@supabase/supabase-js") as typeof import("@supabase/supabase-js");

// ── Config ───────────────────────────────────────────────────────────────────

dotenvMod.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY:  string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  EXPO_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env");
  process.exit(1);
}

const supabase   = createClient(SUPABASE_URL, SERVICE_KEY);
const DRY_RUN    = process.argv.includes("--dry-run");
const BACKUP_DIR = path.resolve(__dirname, "backup");
const LOG_FILE   = path.resolve(BACKUP_DIR, "_migration-log.txt");

type BucketConfig = { bucket: string; maxWidth: number; quality: number };

const BUCKETS: BucketConfig[] = [
  { bucket: "pet-photos", maxWidth: 1200, quality: 82 },
  { bucket: "avatars",    maxWidth: 400,  quality: 80 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtKB(bytes: number): string {
  return (bytes / 1024).toFixed(0) + " KB";
}

function fmtPct(before: number, after: number): string {
  if (before === 0) return "n/a";
  return "−" + Math.round((1 - after / before) * 100) + "%";
}

function logLine(msg: string): void {
  console.log(msg);
  if (!DRY_RUN) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, msg + "\n");
  }
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question + " [y/N] ", (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

async function listFolder(bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = [];
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 200, sortBy: { column: "name", order: "asc" } });

  if (error) throw new Error(`list [${bucket}/${folder || "root"}]: ${error.message}`);

  for (const item of (data ?? [])) {
    if (item.id === null) {
      const sub = await listFolder(bucket, folder ? `${folder}/${item.name}` : item.name);
      paths.push(...sub);
    } else {
      paths.push(folder ? `${folder}/${item.name}` : item.name);
    }
  }
  return paths;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n" + "═".repeat(60));
  console.log(DRY_RUN
    ? "  🔍  DRY-RUN — keine Änderungen werden geschrieben"
    : "  🚀  LIVE-MODE — Bilder werden komprimiert und überschrieben");
  console.log("═".repeat(60) + "\n");

  let totalFiles  = 0;
  let totalBefore = 0;
  let totalAfter  = 0;
  let skipped     = 0;
  let confirmed   = false;

  for (const cfg of BUCKETS) {
    console.log(`\n📁  Bucket: ${cfg.bucket}  (maxWidth=${cfg.maxWidth}, Q${cfg.quality})`);
    console.log("─".repeat(50));

    let files: string[];
    try {
      files = await listFolder(cfg.bucket, "");
    } catch (e: any) {
      console.error(`  ❌  Fehler beim Auflisten: ${e.message}`);
      continue;
    }

    if (files.length === 0) {
      console.log("  (leer)");
      continue;
    }

    console.log(`  ${files.length} Dateien gefunden\n`);

    for (const filePath of files) {
      const ext = filePath.split(".").pop()?.toLowerCase() ?? "";

      // SVGs überspringen (Vektorgrafik, kein JPEG-Nutzen)
      // JPEGs überspringen (bereits komprimiert)
      if (ext === "svg" || ext === "jpg" || ext === "jpeg") {
        console.log(`  [skip] ${filePath}  (${ext})`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [dry-run] würde verarbeiten: ${filePath}`);
        totalFiles++;
        continue;
      }

      // Einmalige Bestätigung vor erstem Upload
      if (!confirmed) {
        const ok = await confirm(
          `\n⚠️   ${files.length} Dateien in "${cfg.bucket}" werden komprimiert. Backup: scripts/backup/. Fortfahren?`
        );
        if (!ok) { console.log("  Abgebrochen."); process.exit(0); }
        confirmed = true;
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        fs.appendFileSync(LOG_FILE, `\n=== Migration ${new Date().toISOString()} ===\n`);
      }

      // Download
      const { data: blob, error: dlErr } = await supabase.storage
        .from(cfg.bucket).download(filePath);

      if (dlErr || !blob) {
        console.error(`\n  ❌  FEHLER beim Download: ${filePath} — ${dlErr?.message}`);
        console.error(`  Migration gestoppt. Backup bisher: ${BACKUP_DIR}`);
        process.exit(1);
      }

      const originalBuf = Buffer.from(await blob.arrayBuffer());
      const beforeBytes = originalBuf.length;

      // Backup
      const backupPath = path.join(BACKUP_DIR, cfg.bucket, filePath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, originalBuf);

      // Sharp: resize + JPEG
      const compressedBuf = await sharpMod(originalBuf)
        .resize({ width: cfg.maxWidth, withoutEnlargement: true })
        .jpeg({ quality: cfg.quality })
        .toBuffer();

      const afterBytes = compressedBuf.length;

      // Upload (gleicher Pfad, upsert)
      const { error: upErr } = await supabase.storage
        .from(cfg.bucket)
        .upload(filePath, compressedBuf, { contentType: "image/jpeg", upsert: true });

      if (upErr) {
        console.error(`\n  ❌  FEHLER beim Upload: ${filePath} — ${upErr.message}`);
        console.error(`  Migration gestoppt. Backup bisher: ${BACKUP_DIR}`);
        process.exit(1);
      }

      const line = `  ✅  [${cfg.bucket}] ${filePath}: ${fmtKB(beforeBytes)} → ${fmtKB(afterBytes)} (${fmtPct(beforeBytes, afterBytes)})`;
      logLine(line);

      totalFiles  += 1;
      totalBefore += beforeBytes;
      totalAfter  += afterBytes;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  if (DRY_RUN) {
    console.log(`  ✅  Dry-Run abgeschlossen.`);
    console.log(`  📊  ${totalFiles} Dateien würden verarbeitet werden.\n`);
    console.log(`  Zum echten Ausführen:`);
    console.log(`  node --experimental-strip-types scripts/recompress-images.ts`);
  } else {
    const savedMB  = ((totalBefore - totalAfter) / 1048576).toFixed(1);
    const beforeMB = (totalBefore / 1048576).toFixed(1);
    const afterMB  = (totalAfter  / 1048576).toFixed(1);
    const pct      = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : 0;

    const summary = [
      `\n=== Summary ===`,
      `  Verarbeitet : ${totalFiles} Dateien`,
      `  Übersprungen: ${skipped} Dateien`,
      `  Vorher      : ${beforeMB} MB`,
      `  Nachher     : ${afterMB} MB`,
      `  Gespart     : ${savedMB} MB (−${pct}%)`,
      `  Backup      : ${BACKUP_DIR}`,
    ].join("\n");

    console.log(summary);
    logLine(summary);
  }
  console.log("═".repeat(60) + "\n");
}

main().catch((e: any) => {
  console.error("Unerwarteter Fehler:", e);
  process.exit(1);
});
