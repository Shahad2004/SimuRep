# Deploy SIMU-LAB Online – Step-by-Step Guide

This guide walks you through putting your SIMU-LAB website on the internet. The app is a **Vite + React** static site; the build output is the `dist` folder.

---

## Before You Start

1. **Git**: Your project should be in a Git repo (local is enough; you’ll connect it to the host).
2. **Node.js**: Installed (e.g. 18 or 20). Check with `node -v`.
3. **Build**: From the project root run:
   ```bash
   npm install
   npm run build
   ```
   You should see a `dist` folder with `index.html` and an `assets` folder. If this works, you’re ready to deploy.

---

## Option A: Vercel (Recommended – Easiest)

Vercel works very well with Vite and gives you a free HTTPS URL and automatic deploys from Git.

### Step 1: Push your code to GitHub

1. Create a **GitHub** account if you don’t have one: [github.com](https://github.com).
2. Create a new repository (e.g. `simulab`). Do **not** add a README if your project already has files.
3. In your project folder, open PowerShell and run:

   ```powershell
   cd "C:\Users\ASUS\OneDrive - AL-Hussien bin Abdullah Technical University\Capston Code"
   git init
   git add .
   git commit -m "Initial commit - SIMU-LAB"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your GitHub username and `YOUR_REPO_NAME` with the repo name (e.g. `simulab`).

### Step 2: Sign up and import on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (choose **Continue with GitHub**).
2. Authorize Vercel to access your GitHub account.
3. Click **Add New…** → **Project**.
4. **Import** the repository you just pushed (e.g. `simulab`).
5. Vercel will detect Vite. Leave the defaults:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Click **Deploy**.

### Step 3: Get your live URL

- When the build finishes, Vercel shows a URL like:  
  `https://simulab-xxxx.vercel.app`
- Click it to open your site. Share this link with students/instructors.

### Step 4: (Optional) Custom domain

- In the Vercel project, go to **Settings** → **Domains**.
- Add your domain and follow the instructions to point DNS to Vercel.

### Step 5: Future updates

- Change code locally, then:

  ```powershell
  git add .
  git commit -m "Describe your change"
  git push
  ```

  Vercel will automatically build and deploy the new version.

---

## Option B: Netlify

Netlify also offers a free tier and works well with Vite.

### Step 1: Push code to GitHub

- Same as **Option A, Step 1** (push your project to a GitHub repo).

### Step 2: Sign up and add site on Netlify

1. Go to [netlify.com](https://netlify.com) and sign up with GitHub.
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub** and select your repository.
4. Build settings (the project’s `netlify.toml` already sets these):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy site**.

### Step 3: Your live URL

- Netlify gives you a URL like:  
  `https://random-name-12345.netlify.app`
- You can change the site name under **Site configuration** → **Domain management** → **Options** → **Edit site name** (e.g. `simulab.netlify.app`).

### Step 4: Updates

- Push to GitHub; Netlify will rebuild and deploy automatically.

---

## Option C: GitHub Pages

Free hosting under a URL like `https://username.github.io/repo-name/`.

### Step 1: Set the base path in Vite

Because the site will live in a subpath (e.g. `/simulab/`), add `base` to `vite.config.ts`:

```ts
export default defineConfig({
  base: '/YOUR_REPO_NAME/',   // e.g. '/simulab/'
  plugins: [
    react(),
    tailwindcss(),
  ],
  // ... rest unchanged
})
```

Replace `YOUR_REPO_NAME` with your GitHub repository name. Then run `npm run build` again.

### Step 2: Install the GitHub Pages deploy script

```powershell
npm install --save-dev gh-pages
```

Add these to `package.json` (inside `"scripts"`):

```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

### Step 3: Push code to GitHub

- Create a repo and push your project (as in Option A, Step 1).

### Step 4: Enable GitHub Pages and deploy

1. On GitHub, open your repo → **Settings** → **Pages**.
2. Under **Source**, choose **GitHub Actions**.
3. In your project, create the file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

4. Commit and push:

   ```powershell
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Pages deploy"
   git push
   ```

5. After the workflow runs (Actions tab), go to **Settings** → **Pages**. Your site will be at:
   `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

**Important:** Everywhere you link to the site (e.g. join links), use this full URL (including the repo name). The `base` in Vite must match the repo name.

---

## Option D: Manual upload (any static host)

If you use another host (e.g. your university server, cPanel, or any static hosting):

1. Build locally:
   ```powershell
   npm run build
   ```
2. Upload the **contents** of the `dist` folder (not the folder itself) to the web root (e.g. `public_html` or `www`).
3. Ensure the server is configured to serve `index.html` for all paths (SPA fallback). For **Apache**, add a `.htaccess` in `dist`:

   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

   Then upload the contents of `dist` again (including `.htaccess`).

---

## Summary

| Method      | Best for              | URL example                    | Custom domain |
|------------|------------------------|--------------------------------|---------------|
| **Vercel** | Easiest, auto deploy   | `xxx.vercel.app`               | Yes           |
| **Netlify**| Same, great free tier | `xxx.netlify.app`              | Yes           |
| **GitHub Pages** | Free, repo-based | `username.github.io/repo`     | Yes           |
| **Manual** | Your own server       | Whatever you configure         | Depends       |

For most cases, **Vercel** or **Netlify** is the simplest: connect GitHub, click Deploy, and use the URL they give you. The project already includes `vercel.json` and `netlify.toml` so build and SPA routing are set.

---

## Troubleshooting

- **Build fails on Vercel/Netlify:** Check the build log. Often it’s Node version (e.g. set to 18 or 20 in project settings) or a missing env variable. This app doesn’t require env vars for basic deploy.
- **Blank page online:** Confirm the host serves `index.html` for all routes (SPA redirect). Vercel/Netlify handle this with the included config.
- **Join link (`?join=PIN`) doesn’t work:** The URL must be the exact deployed URL (e.g. `https://simulab.vercel.app?join=123456`). No trailing slash before `?`.
- **Git push rejected:** If you have a different branch name (e.g. `master`), use `git push -u origin master` and in Vercel/Netlify set the production branch to that name.
