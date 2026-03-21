# Frontend Dockerfile (Development)
# @owner fankahou, LukasStefanek
# @issue https://github.com/ValGSgit/AlpacaParty/issues/1

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
