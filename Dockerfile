FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

EXPOSE 3000

ENV BOT_TOKEN=${BOT_TOKEN}

CMD ["node", "dist/start.ts"]
