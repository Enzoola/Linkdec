# Linkdeck

A link-in-bio service anyone can sign up for. Each person gets a public page at `yourapp.vercel.app/username`,
an editor with themes, and analytics (views, clicks per link, clicks per day, where visitors came from).

Stack: Next.js 15 (App Router) on Vercel, Supabase (Postgres, email sign-in). Both have free tiers.

## Deploy (about 20 minutes)

### 1. Create the Supabase project
1. Go to supabase.com, sign up, click **New project**. Pick any name, a strong database password, and the region closest to your users (Europe or South Africa for Nigeria).
2. When it finishes, open **SQL Editor**, click **New query**, paste the whole of `supabase/schema.sql`, and click **Run**. You should see "Success".
3. Open **Project Settings, API**. Copy the **Project URL** and the **anon public** key (it may be labelled "publishable"). You need both in step 3.

### 2. Put the code on GitHub
```bash
cd linkdeck-app
git init && git add . && git commit -m "Linkdeck"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/YOUR-NAME/linkdeck.git
git branch -M main && git push -u origin main
```

### 3. Deploy on Vercel
1. Go to vercel.com, sign up with GitHub, click **Add New, Project**, and import the repo.
2. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
3. Click **Deploy**. When it finishes you get an address like `linkdeck-xyz.vercel.app`. (You can rename it under Project Settings, Domains.)

**If the site shows a 500 error or says it is not connected:** the two variables are missing or misspelled. Fix them under Project Settings, Environment Variables, then open Deployments, click the three dots on the newest deployment, and choose Redeploy. Variables only take effect on a new deploy.

### 4. Tell Supabase your address (required, or sign-in links will fail)
In Supabase, open **Authentication, URL Configuration**:
- **Site URL**: `https://YOUR-APP.vercel.app`
- **Redirect URLs**: add `https://YOUR-APP.vercel.app/auth/callback` (and `http://localhost:3000/auth/callback` if you develop locally)

### 5. Test it
Open your address, click **Create your page**, enter your email, open the link from the email in the same browser, claim a username, add a link, press **Save**, and open `/yourusername` in a private window.

## Before you tell people about it

- **Email limits.** Supabase's built-in email sender allows only a few sign-in emails per hour. Real users will hit that quickly. Set up your own sender under **Authentication, SMTP Settings** (Resend has a free tier and takes about 10 minutes), then raise the limits under **Authentication, Rate Limits**.
- **Same-browser sign-in.** The email link must be opened in the browser where the person asked for it. On phones, mail apps sometimes open links in their own browser, which fails. If that shows up in testing, change the Supabase magic-link email template to send a 6-digit code and add a code box to `app/login/LoginForm.tsx`.
- **Abuse.** Open sign-up attracts spam and phishing pages. To take a page down:
  ```sql
  update profiles set disabled = true where username = 'the_username';
  ```
  Run it in the Supabase SQL editor. The page and its links stop working immediately. Add a "Report this page" contact before launch, and write short terms of use.
- **Custom domain.** Optional, later. Add it under Vercel Project Settings, Domains, then update the Supabase URLs from step 4.

## Run locally
```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev                  # http://localhost:3000
```

## How it works

| Piece | Where |
|---|---|
| Database, security rules, tracking and stats functions | `supabase/schema.sql` |
| Public page `/username` (records a view) | `app/[username]/page.tsx` |
| Link click counting, then redirect | `app/api/go/[id]/route.ts` |
| Sign-in | `app/login`, `app/auth/callback` |
| Editor and analytics | `app/dashboard` |

- Visitors cannot write to the database directly. They can only call two functions, `track_view` and `track_click`.
- Every user can read and change only their own rows. Usernames cannot be changed, and users cannot un-disable their own page.
- Links must start with `http://` or `https://`. This is enforced in the database as well as the editor.
- Bots (search engines, link previews) are not counted.

## Known limits of this first version
- Refreshing a page counts as another view. There is no unique-visitor count yet.
- Usernames are permanent.
- No profile photo upload (an initials avatar is used).
- No email notifications, scheduling, or team accounts.
- The database was tested with an in-memory Postgres (36 checks: row security, bad input, stats). The Supabase sign-in email flow and Vercel deploy could only be tested once you connect real accounts.
