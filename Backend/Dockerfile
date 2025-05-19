# Base image
FROM node:16-alpine

WORKDIR /backend_server
COPY . .

RUN npm install --legacy-peer-deps
CMD [ "npm", "start" ]

