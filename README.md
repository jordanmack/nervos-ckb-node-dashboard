# Nervos CKB Node Dashboard

![GitHub package.json version](https://img.shields.io/github/package-json/v/jordanmack/nervos-ckb-node-dashboard)
![GitHub last commit](https://img.shields.io/github/last-commit/jordanmack/nervos-ckb-node-dashboard)
![CircleCI](https://img.shields.io/circleci/build/github/jordanmack/nervos-ckb-node-dashboard)
![Libaries.io](https://img.shields.io/librariesio/release/github/jordanmack/nervos-ckb-node-dashboard)
![GitHub Repo stars](https://img.shields.io/github/stars/jordanmack/nervos-ckb-node-dashboard?style=social)

This is a web-based dashboard for monitoring a Nervos CKB L1 node. This allows full node operators to monitor their local node using a friendly UI/UX instead of having to rely exclusively on the console.

The current version is specifically designed to fit a 7" Raspberry Pi screen with a resolution of 800x480. It can be used with higher resolutions, but it is not responsive. Support for more resolutions may be added in the future.

Note: This is not intended for use with a public node since it makes constant RPC requests and relies on methods which are not exposed on public nodes.

![Screenshot](https://user-images.githubusercontent.com/37931/280556136-825c272e-aa2f-4766-93e1-009e8cd10cc6.png)

## Todo/Wishlist

- Add online node address configuration.
- Add error handling for unreachable node.
- Add additional statistics.
- Add the ability to toggle between stat views.
- Add support for batch RPC requests.
- Add support for more resolutions.
- Add support for public nodes.
- Add support for websockets.
- Add a help screen to describe what the stats are.
- Create a public website that is usable without compilation.
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
