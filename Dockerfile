# ===============================================
# CoWorkSpace Frontend Dockerfile
# Serve static files with http-server
# ===============================================

FROM node:18-alpine

# Metadata
LABEL maintainer="CoWorkSpace Team"
LABEL description="Frontend server for CoWorkSpace platform"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Install global dependencies
RUN npm install -g http-server@14.1.1

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S frontend -u 1001 -G nodejs

# Copy application files
COPY --chown=frontend:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads temp && \
    chown -R frontend:nodejs /app

# Switch to non-root user
USER frontend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

# Start command
# http-server options:
# -p 3001: port
# --cors: enable CORS
# -c-1: disable caching for development
# --log-ip: log client IP addresses
# -o: open browser (disabled in container)
# -s: silent mode for cleaner logs
CMD ["http-server", ".", "-p", "3001", "--cors", "-c-1", "--log-ip", "-s"]