#TODO: Update everything later for deployment
# Base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY . .

RUN npm install

# Expose the port on which the app runs
EXPOSE 3000

# Build the application
CMD npm start