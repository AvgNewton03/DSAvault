# Items needed from you before public launch

Everything needed to run the application locally is included: the API creates its MongoDB collections automatically and `docker compose up -d` starts a persistent local database.

> This workspace currently cannot access the local Docker socket, so you will need to run that one command from a terminal with Docker access (or provide a MongoDB connection string). No application code or database schema work remains for local persistence.

I only need these external decisions or credentials to take DSA Vault beyond your computer:

1. **Production hosting target.** Choose a host (for example Render, Railway, Fly.io, AWS, or your own server), or provide its access details. This is required to deploy the frontend, API, and database publicly.
2. **Production MongoDB connection string.** A MongoDB Atlas project/connection string, or permission to create one in an account you control. Do not paste it into source code; it belongs in the host's encrypted environment variables.
3. **A long production JWT secret.** Generate or provide a unique random value for `JWT_SECRET` in the host's secret manager.
4. **Public domain and DNS access, if desired.** Needed only for a custom domain and HTTPS configuration.
5. **Email provider credentials, if password reset/verification emails are required.** The current secure login works without email delivery; transactional email needs a provider such as Resend, Postmark, or SES and an approved sender domain.

## Local launch

```bash
docker compose up -d
cp .env.example .env
npm run server
npm run dev
```

The frontend is configured to use the local API proxy. Create an account from the sign-up screen; all dashboard data will then be real, private data for that account.
