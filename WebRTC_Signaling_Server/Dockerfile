# Base image
FROM node:20-alpine

WORKDIR /webrtc_server
COPY . .

RUN     npm i
CMD [ "npm", "start" ]

