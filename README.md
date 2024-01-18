# Nervos CKB Node Dashboard

![GitHub package.json version](https://img.shields.io/github/package-json/v/jordanmack/nervos-ckb-node-dashboard)
![GitHub last commit](https://img.shields.io/github/last-commit/jordanmack/nervos-ckb-node-dashboard)
![CircleCI](https://img.shields.io/circleci/build/github/jordanmack/nervos-ckb-node-dashboard)
![Libaries.io](https://img.shields.io/librariesio/release/github/jordanmack/nervos-ckb-node-dashboard)
![Uptime Robot status](https://img.shields.io/uptimerobot/status/m795828299-fd5c1e9b56e9626b4b966d9c)
![Uptime Robot ratio (30 days)](https://img.shields.io/uptimerobot/ratio/m795828299-fd5c1e9b56e9626b4b966d9c)
![GitHub Repo stars](https://img.shields.io/github/stars/jordanmack/nervos-ckb-node-dashboard?style=social)

This is a web-based dashboard for monitoring a Nervos CKB L1 node. This allows full node operators to monitor their local node using a friendly UI/UX instead of having to rely exclusively on the console.

The current version is specifically designed to fit a 5"-7" Raspberry Pi screen with a resolutions between 800x480 and 1280x720. Support for more resolutions may be added in the future.

Note: This is not intended for use with a public node since it makes constant RPC requests and relies on methods which are not exposed on public nodes. Future versions may add support for this.

![Screenshot](https://user-images.githubusercontent.com/37931/280556136-825c272e-aa2f-4766-93e1-009e8cd10cc6.png)

## Live Version

A live version of this app can be used at the URL below. Please pay attention to the notes below!

http://ckb-node-dashboard.ckbdev.com/

### Notes
- This live URL is **NOT** a secure URL on purpose since we need to make RPC requests to insecure sources.
- Firefox is the recommended browser because it does not have the issues noted below.
- Browsers based on the Chromium engine, such as Chrome, Opera, and Edge, disable access to local network resources by default. This gives a CORS error in the developer console: `The request client is not a secure context and the resource is in more-private address space private.` This can be reenabled by opening `about://flags#block-insecure-private-network-requests` in the browser, and setting `Block insecure private network requests` to `Disabled`.
- Chromium based browsers on some Linux distros require an extra package to be installed to display emojis correctly: `sudo apt-get install fonts-noto-color-emoji`

## Todo/Wishlist

- ~~Create a public website that is usable without compilation.~~
- ~~Add better error handling for unreachable node.~~
- ~~Add CKB node address configuration.~~
- ~~Add support for more resolutions.~~
- ~~Add support for batch RPC requests.~~
- ~~Add support for public nodes.~~
- Use HTML grid instead of absolute height elements.
- Add a help screen to describe what the stats are.
- Add the ability to toggle between stat views.
- Add support for light mode and dark mode.
- Add support for websockets.
- Add additional statistics.
- Add troubleshooting FAQ.
- Add seasonal themes.
- Suppress duplicate network errors.
- Refactor code.

## Developing

These instructions describe how to develop, build, and deploy the code base for the dashboard.

### Technology Stack
- Node.js (LTS v18+)
- TypeScript (v4.9+)
- React (v18+ via CRA v5+)
- SASS (v1.69+)
- Tailwind (v3.3+)

### Development Server

The following commands will run a local development server on port `3000`.

```sh
git clone --depth=1 https://github.com/jordanmack/nervos-ckb-node-dashboard.git
cd nervos-ckb-node-dashboard
npm i
npm start
```

### Building and Deploying

The compiled version of this code is completely static and can be hosted on a basic web server. No backend daemons or processes are needed. 

The following commands will build the production-ready files for deployment. After building, copy all files from the `build` folder to the root of your web server.

```sh
git clone --depth=1 https://github.com/jordanmack/nervos-ckb-node-dashboard.git
cd nervos-ckb-node-dashboard
npm i
npm run build
```
