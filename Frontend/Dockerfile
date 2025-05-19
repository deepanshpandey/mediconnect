# Step 1: Build Angular app using Node
FROM node:16-alpine AS build-stage

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app source
COPY . .

# Build the Angular app for production
RUN npm run build -- --prod

# Step 2: Serve with NGINX
FROM nginx:alpine AS production-stage

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy the compiled Angular app to NGINX's public directory
COPY --from=build-stage /app/dist/Frontend/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (NGINX default)
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]