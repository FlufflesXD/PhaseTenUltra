# 🃏 TenStages (Online Multiplayer)

A minimal, clean, authentic online multiplayer 10-stage rummy card game designed for self-hosted servers and Portainer.

- **Clean Black & White / Minimalist UI**: An unstyled, lightweight base ready for your own custom themes and styling.
- **TenStages Rules**: Standard 108-card deck (96 numbers, 8 Wilds, 4 Skips), 10 stages, built-in Half Rule, hitting rules, and scoring.
- **Room & Code System**: Create a lobby or join with a 4-letter code.
- **No Accounts Required**: Enter your name and play immediately.
- **Single Port Deployment**: Serves both WebSocket server and React client directly on port **`6969`**. No Nginx container needed.
- **No Audio Assets**: Ready for you to plug in your own sound effects when desired.

---

## 🚀 Portainer Deployment Guide

### Option 1: Deploy as a Stack in Portainer

1. Open your **Portainer Web UI** (e.g. `http://192.168.1.8:9000`).
2. Go to **Stacks** ➡️ **Add Stack**.
3. Choose **Web editor** and paste:

```yaml
version: "3.8"

services:
  tenstages:
    build:
      context: .
      dockerfile: Dockerfile
    image: tenstages:v5.9
    container_name: tenstages
    restart: unless-stopped
    ports:
      - "6969:6969"
    environment:
      - NODE_ENV=production
      - PORT=6969
```

4. Click **Deploy the stack**.
5. Access at: `http://192.168.1.8:6969`.

---

### Option 2: Run via Docker CLI on Server

```bash
# Build image
docker build -t tenstages:v5.9 .

# Run container
docker run -d \
  --name tenstages \
  --restart unless-stopped \
  -p 6969:6969 \
  -e PORT=6969 \
  tenstages:v5.9
```

---

## 🛠️ Local Development & Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run locally on this machine
npm start
```
Then visit `http://localhost:6969`.
