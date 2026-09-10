# HiveNotes

HiveNotes is a written classroom notebook. Each student has their own ruled book — pen or stylus on the lines (convert to journal text), keyboard when you want it, Excalidraw diagrams, photos, and voice. Everyone else’s books stay readable. The teacher compiles those pages into one shared class revision (guide, quiz, citations, listen). Students write for free. Hive Pro unlocks extra compiles after the first one.

## Local run

```bash
# 1. Postgres running, then:
cd server
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, GROQ_API_KEY
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev            # http://localhost:4000

# 2. In another terminal:
cd web
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3001
```

Open **http://localhost:3001**. Create a journal (you are the teacher). Join from another browser with the code (student). Write with Pen on the ruled page, then Compile.

## Teacher / student demo

1. Teacher: **New Journal** — you own the class hive. Students: **Open Journal** with the code.
2. Stylus on the ruled page; pause so ink converts into the journal font on that line.
3. Second student writes in **their** book. Flip to another student’s book (read-only).
4. Teacher taps **Compile**. First compile is free. A second compile shows Hive Pro ($4.99 / class / month).
5. Class revision: guide + quiz citing those handwritten pages.

Never paywall Pen, convert, diagrams, photos, voice, or joining.

## RevenueCat (Hive Pro)

Web Billing counts as a web purchase (no Apple developer account).

| Variable | Where | What |
|---|---|---|
| `REVENUECAT_SECRET_API_KEY` | API | Secret REST key (`sk_…`) |
| `REVENUECAT_WEB_API_KEY` | API | Public Web Billing key (`rcb_…`) |
| `NEXT_PUBLIC_RC_API_KEY` | Web | Same public `rcb_…` key |
| `REVENUECAT_WEBHOOK_SECRET` | API | Optional webhook bearer |
| `REVENUECAT_ENTITLEMENT` | API | Default `hive_pro` |

Dashboard: entitlement **`hive_pro`**, offering with a monthly product at **$4.99**. Webhook: `POST /billing/webhook`. Server enforces extra compiles; the paywall only appears on Compile.

## Hosted demo (Render)

Blueprint: [`render.yaml`](render.yaml). Apply at [dashboard.render.com/blueprint/new](https://dashboard.render.com/blueprint/new?repo=https://github.com/Yusuf-cm/hivenotes) from branch `classroom-journal`. Fill `GROQ_API_KEY` and RevenueCat keys when prompted.

## iPad shell

Capacitor WebView in [`mobile/`](mobile/). Film the demo on iPad (Apple Pencil). See `mobile/README.md`.

## License

ISC. See [LICENSE](LICENSE).
