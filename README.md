# DSA Vault

A private, high-concurrency DSA revision platform with account-scoped MongoDB data and adaptive spaced repetition.

### Local Development
```bash
npm install
docker compose up -d mongodb
cp .env.example .env
npm run server
npm run dev
```

### Production Build & Launch (Single Container or Cloud PaaS)
```bash
npm install
npm run build
npm run start
```

For complete step-by-step instructions on setting up a free **MongoDB Atlas** cloud database, deploying to **Render**, **Railway**, **Vercel**, or running via **Docker Compose**, see the **[Production Deployment Guide](./DEPLOYMENT.md)**.

