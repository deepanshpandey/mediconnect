# Base image
FROM node:16-alpine

WORKDIR /webrtc_server
COPY . .

RUN     npm i
CMD [ "npm", "start" ]

