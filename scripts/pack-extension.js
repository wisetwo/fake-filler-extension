#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

// eslint-disable-next-line import/no-extraneous-dependencies
const archiver = require("archiver");

// In CommonJS, __dirname is already available as a global variable

// Read package.json
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Validate version string to prevent injection
const { version } = packageJson;

// Create extension directory
const extensionDir = path.resolve(__dirname, "../release");
if (!fs.existsSync(extensionDir)) {
  fs.mkdirSync(extensionDir, {
    recursive: true,
  });
}

// Source directory - dist
const distDir = path.resolve(__dirname, "../dist");

// Create zip file
const zipFileName = `auto-filler-v${version}.zip`;
const zipFilePath = path.resolve(extensionDir, zipFileName);

// Delete existing zip file
if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

// Create a file to stream archive data to
const output = fs.createWriteStream(zipFilePath);
const archive = archiver("zip", {
  zlib: {
    level: 9,
  }, // Sets the compression level
});

// Listen for all archive data to be written
output.on("close", () => {
  console.log(
    `Extension packed successfully: ${zipFileName} (${archive.pointer()} total bytes saved in extension directory)`
  );

  // Create a copy as auto-filler-latest.zip
  const latestZipFileName = "auto-filler-latest.zip";
  const latestZipFilePath = path.resolve(extensionDir, latestZipFileName);

  // Delete existing latest zip file if it exists
  if (fs.existsSync(latestZipFilePath)) {
    fs.unlinkSync(latestZipFilePath);
  }

  // Copy the versioned zip to latest zip
  fs.copyFileSync(zipFilePath, latestZipFilePath);
  console.log(`Latest version copied: ${latestZipFileName}`);
});

// Handle warnings and errors
archive.on("warning", (err) => {
  if (err.code === "ENOENT") {
    console.warn("Warning during archiving:", err);
  } else {
    console.error("Error during archiving:", err);
    process.exit(1);
  }
});

archive.on("error", (err) => {
  console.error("Error during archiving:", err);
  process.exit(1);
});

// Pipe archive data to the file
archive.pipe(output);

// Append files from dist directory, putting files at the root of archive
archive.directory(distDir, false);

// Finalize the archive (i.e. we are done appending files but streams have to finish yet)
archive.finalize();
