# 1. Base image (using the same major version of Node.js that you have installed locally)
FROM node:26-alpine

# 2. Working directory inside the container
WORKDIR /app

# 3. Copy package description files first to leverage Docker's caching mechanism
COPY package*.json ./

# 4. Install project dependencies inside the container
RUN npm install

# 5. Copy the rest of the application files to the container
COPY . .

# 6. Expose the port our app runs on
EXPOSE 3000

# 7. Start the application
CMD ["npm", "start"]
