# DDC Streaming Telegram Mini App

Telegram Mini Application that allows users to stream content/watch content, use a subscription model to get access to content and verify NFT ownership.

# How to run

1. Install dependencies

```bash
npm install
```

2. Copy ENV file

```bash
cp .env.sample .env
```

3. Start for development

```bash
npm start
```

4. Build for production

```bash
npm run build
```

## How to deploy

Just merge changes into `dev` or `master` branch. [These standard CI jobs](https://github.com/cere-io/integration-telegram-app/actions) will deploy the app to appropriate environment.
