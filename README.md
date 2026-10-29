# Project Spark

A classroom sign-in web app. Students tap a big button with their name at set times of the day, and see a friendly message saying whether they were early, on time or late.

See [SPEC.md](SPEC.md) for the full specification and [roadmap.md](roadmap.md) for status.

## How it works

- Windows: Good Morning 10:00 to 10:15, After Recess 11:28 to 11:33, After Lunch 1:25 to 1:30. Sign-in closes at 3:00 PM.
- The teacher enables or disables sign-in with a password, and views attendance (also password protected) at `/attendance`.
- Sign-ins are saved in the browser (localStorage) on the device that is used. Use "Download CSV" on the attendance page for a backup.
- Times come from the device's clock, so keep it correct.

## Development

You need Node.js and npm.

```sh
npm i
npm run dev      # http://localhost:8080
npm test         # unit tests
npm run build
```

Built with Vite, React 19, TanStack Router and Tailwind 4 as a plain static site: no server and no Lovable dependency.

## Hosting

Upload `dist` (from `npm run build`) to any static host; the build adds `404.html` and `_redirects` so deep links like `/admin` work. For a sub-path such as GitHub Pages, build with `VITE_BASE=/project-spark/ npm run build`; `.github/workflows/pages.yml` does this on every push to `main`. `npm run build:offline` makes the single-device package in `./offline`.
