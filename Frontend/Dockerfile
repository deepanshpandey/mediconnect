# FROM nginx:1.17.1-alpine
# COPY ./dist/Frontend /usr/share/nginx/html

FROM node:16-alpine
    
# Create a directory where our app will be placed
RUN mkdir -p /app

# Change directory so that our commands run inside this new directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json /app/

# Install dependecies
RUN npm install --legacy-peer-deps

# Get all the code needed to run the app
COPY . /app/

# Expose the port the app runs in
EXPOSE 4200

# Serve the app
CMD ["npm", "start", "--", "--host", "0.0.0.0"]