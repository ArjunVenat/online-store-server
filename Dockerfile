#TODO: Update everything later for deployment
# Base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./

RUN npm install

# Build the application
RUN npm start

# Expose the port on which the app runs
EXPOSE 3000