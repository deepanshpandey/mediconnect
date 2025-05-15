# Base image
FROM node:16-alpine

WORKDIR /backend_server
COPY . /backend_server/
COPY /users/logger.js /backend_server/logger.js

RUN npm install --legacy-peer-deps
CMD [ "npm", "start" ]

