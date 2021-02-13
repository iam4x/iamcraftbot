FROM node:14-alpine

ENV PORT 3080
EXPOSE 3080

WORKDIR /app
COPY package*.json yarn.lock ./

RUN yarn --network-timeout 1000000
COPY . .

CMD yarn start
