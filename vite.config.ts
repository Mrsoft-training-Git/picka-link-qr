import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Enable Nitro when deploying to Vercel
  nitro: process.env.VERCEL ? true : false,

  tanstackStart: {
    server: {
      entry: "server",
    },
  },
});
