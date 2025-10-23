FROM ubuntu:20.04
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y wget curl tar nano make npm python3.8 python3.8-venv python3-pip nginx

# Download Node.js tarball
RUN curl -o node.tar.gz -L https://nodejs.org/download/release/v18.16.0/node-v18.16.0-linux-x64.tar.gz

# Extract Node.js
RUN tar xzf node.tar.gz --strip-components=1 -C /usr/local

# Cleanup
RUN rm node.tar.gz

# Add Node.js to PATH
ENV PATH="/usr/local/bin:${PATH}"

# Verify installation
RUN node --version && npm --version
# ENV PATH=”/node-v18.16.0-linux-x64/bin:${PATH}”
# RUN node -v

# Download and extract Redis source code
RUN wget http://download.redis.io/releases/redis-5.0.7.tar.gz && \
    tar xzf redis-5.0.7.tar.gz

# Build Redis
RUN cd redis-5.0.7 && \
    make

# Install Redis
RUN cd redis-5.0.7 && \
    make install

# Cleanup unnecessary files
RUN rm -rf redis-5.0.7.tar.gz redis-5.0.7

# Create Django App
RUN mkdir -p /app
WORKDIR /app

# Add Django App
COPY . .
RUN rm -rf /ve

# Install node packages for svelte
RUN npm install

# Configure Nginx reverse-proxy to work with our current make configuration
COPY nginx.docker.conf /etc/nginx/sites-available/default

# Expose port 80 for Nginx
EXPOSE 80
EXPOSE 8000
EXPOSE 8125

CMD ["make", "runserver"]
