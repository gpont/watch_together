# Build image

FROM node:20 as build

RUN apt-get update
RUN apt-get install -y sqlite3 

WORKDIR /usr/src/build

COPY package*.json ./
RUN npm ci
COPY . .

RUN npm install --build-from-source --sqlite=/usr/bin sqlite3

RUN npm run build

# Run image

FROM node:20

WORKDIR /usr/src/app

COPY --from=build /usr/src/build/dist ./dist
COPY --from=build /usr/src/build/node_modules ./node_modules

ENV BOT_TOKEN=${BOT_TOKEN}

CMD ["node", "./dist/start.js"]
