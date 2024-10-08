FROM node:20.8

# Create and set the working directory
WORKDIR /api/out/src

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3051
EXPOSE 3051

# Command to run the application
CMD ["node", "."]