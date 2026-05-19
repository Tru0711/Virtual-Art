# Brevo SMTP on Render

Set these environment variables in Render or Vercel for production email delivery:

```dotenv
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_SECURE=false
BREVO_SMTP_USER=your-brevo-login@example.com
BREVO_SMTP_PASS=your-brevo-smtp-key
BREVO_SMTP_FROM="Virtual Art Gallery" <noreply@yourdomain.com>
SMTP_SEND_TIMEOUT_MS=8000
SMTP_VERIFY_TIMEOUT_MS=10000
EMAIL_DEDUPE_WINDOW_MS=10000
```

Notes:

- `BREVO_SMTP_USER` is the Brevo SMTP login, not your Gmail address.
- `BREVO_SMTP_PASS` is the Brevo SMTP key generated in the Brevo dashboard.
- `BREVO_SMTP_FROM` should be a verified sender or verified domain identity in Brevo.
- `SMTP_SEND_TIMEOUT_MS` keeps Render requests from hanging when the mail provider is slow.
- `SMTP_VERIFY_TIMEOUT_MS` limits startup verification latency.
- `EMAIL_DEDUPE_WINDOW_MS` prevents duplicate sends for the same payload during short retry windows.

Implementation notes:

- The backend uses a single shared config module at `backend/config/email.js`.
- The transporter is created once, verified with `transporter.verify()`, and then reused.
- Duplicate sends are deduped in-memory by payload key and also coalesced while a send is in flight.