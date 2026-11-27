import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const storefrontUrl =
    process.env.STOREFRONT_URL || "https://talaro.intellicraft.studio";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Talaro</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f9fafb;
      color: #111827;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    main {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.025em; color: #111827; }
    .tagline { color: #6b7280; font-size: 0.95rem; margin-top: 0.25rem; margin-bottom: 2rem; }
    .btn-group { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.75rem; }
    .btn {
      display: block;
      width: 100%;
      padding: 0.75rem 1.25rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.95rem;
      text-decoration: none;
      transition: background-color 0.15s ease;
      cursor: pointer;
    }
    .btn-primary { background: #2563eb; color: #ffffff; }
    .btn-primary:hover { background: #1d4ed8; }
    @media (min-width: 640px) {
      .btn { width: auto; min-width: 200px; display: inline-block; }
    }
    .footer-link { margin-bottom: 1.5rem; }
    .footer-link a { color: #2563eb; text-decoration: none; font-size: 0.875rem; font-weight: 500; }
    .footer-link a:hover { text-decoration: underline; }
    footer { font-size: 0.75rem; color: #9ca3af; }
  </style>
</head>
<body>
  <main>
    <h1>Talaro</h1>
    <p class="tagline">Verified local suppliers</p>
    <div class="btn-group">
      <a href="/seller" class="btn btn-primary">I'm a Seller</a>
      <a href="/dashboard" class="btn btn-primary">I'm an Admin</a>
    </div>
    <p class="footer-link">
      <a href="${storefrontUrl}">Browse shops as a buyer →</a>
    </p>
    <footer>Talaro pilot</footer>
  </main>
</body>
</html>`;

  res.type("html").send(html);
};
