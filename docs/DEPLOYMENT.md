# BlueLens Deployment Guide

## Table of Contents

1. [Local Development](#local-development)
2. [Production Deployment](#production-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Monitoring](#monitoring)
5. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- **Node.js**: Version 18 or newer
- **npm**: Comes with Node.js
- **Git**: For version control

### Setup Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/potemkin666/bluelens.git
   cd bluelens
   ```

2. **Install dependencies** (dev tools only):

   ```bash
   npm install
   ```

3. **Start the server**:

   ```bash
   npm start
   # or
   node server.js
   ```

4. **Open in browser**:
   ```
   http://localhost:8787
   ```

### Development Workflow

**Running tests**:

```bash
npm test
```

**Running tests with coverage**:

```bash
npm run test:coverage
```

**Linting**:

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

**Formatting**:

```bash
npm run format:check  # Check formatting
npm run format        # Auto-format files
```

**Windows Desktop Shortcut**:

```bash
npm run desktop-icon
```

---

## Production Deployment

### Option 1: Direct Node.js Deployment

#### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended), Windows Server, or macOS
- **Node.js**: 18+ (LTS recommended)
- **RAM**: 512MB minimum, 1GB recommended
- **Disk**: 100MB for app + logs
- **Network**: Port 8787 (or custom) accessible

#### Deployment Steps

1. **Create a deployment user**:

   ```bash
   sudo useradd -m -s /bin/bash bluelens
   sudo su - bluelens
   ```

2. **Clone and setup**:

   ```bash
   git clone https://github.com/potemkin666/bluelens.git
   cd bluelens
   ```

3. **Configure environment** (optional):

   ```bash
   export PORT=8787
   export BLUELENS_LOG_LEVEL=INFO
   export BLUELENS_LOG_FILE=/var/log/bluelens/app.log
   ```

4. **Start with process manager** (PM2 recommended):

   ```bash
   npm install -g pm2
   pm2 start server.js --name bluelens
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

5. **Verify deployment**:
   ```bash
   curl http://localhost:8787/api/ping
   ```

#### Systemd Service (Alternative)

Create `/etc/systemd/system/bluelens.service`:

```ini
[Unit]
Description=BlueLens OSINT Tool
After=network.target

[Service]
Type=simple
User=bluelens
WorkingDirectory=/home/bluelens/bluelens
Environment="PORT=8787"
Environment="NODE_ENV=production"
Environment="BLUELENS_LOG_FILE=/var/log/bluelens/app.log"
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bluelens

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo mkdir -p /var/log/bluelens
sudo chown bluelens:bluelens /var/log/bluelens
sudo systemctl daemon-reload
sudo systemctl enable bluelens
sudo systemctl start bluelens
sudo systemctl status bluelens
```

---

### Option 2: Reverse Proxy Setup (Nginx)

For production, run BlueLens behind a reverse proxy.

#### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### Configure Nginx

Create `/etc/nginx/sites-available/bluelens`:

```nginx
server {
    listen 80;
    server_name bluelens.example.com;

    # Increase upload size limit
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Long-polling support for wait jobs
        proxy_read_timeout 35s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/bluelens /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL/TLS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bluelens.example.com
```

---

## Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy application files
COPY . .

# Expose port
EXPOSE 8787

# Set environment
ENV NODE_ENV=production
ENV PORT=8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8787/api/ping', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "server.js"]
```

### Build and Run

```bash
# Build image
docker build -t bluelens:latest .

# Run container
docker run -d \
  --name bluelens \
  -p 8787:8787 \
  -e PORT=8787 \
  -e BLUELENS_LOG_LEVEL=INFO \
  -v /var/log/bluelens:/var/log/bluelens \
  --restart unless-stopped \
  bluelens:latest

# Check logs
docker logs -f bluelens
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  bluelens:
    build: .
    container_name: bluelens
    ports:
      - "8787:8787"
    environment:
      - PORT=8787
      - BLUELENS_LOG_LEVEL=INFO
      - NODE_ENV=production
    volumes:
      - ./logs:/var/log/bluelens
    restart: unless-stopped
    healthcheck:
      test:
        ["CMD", "node", "-e", "require('http').get('http://localhost:8787/api/ping', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Run with:

```bash
docker-compose up -d
docker-compose logs -f
```

---

## Monitoring

### Application Logs

**Console logs** (if running directly):

```bash
# Follow logs with PM2
pm2 logs bluelens

# Follow logs with systemd
sudo journalctl -u bluelens -f
```

**File logs** (if configured):

```bash
tail -f /var/log/bluelens/app.log
```

### Log Format

Structured JSON logs (when using logger module):

```json
{
  "timestamp": "2026-05-10T10:00:00.000Z",
  "level": "INFO",
  "scope": "BlueLens",
  "message": "Server started",
  "meta": { "port": 8787 }
}
```

### Health Checks

**Manual check**:

```bash
curl http://localhost:8787/api/ping
```

**Expected response**:

```json
{
  "ok": true,
  "uptime_ms": 123456,
  "version": "2026.05.04"
}
```

### Performance Monitoring

**Check upload statistics**:

```bash
curl http://localhost:8787/api/upload-stats
```

**Monitor system resources**:

```bash
# With PM2
pm2 monit

# System resources
htop
df -h
```

### Alerts

Set up monitoring with tools like:

- **Uptime Robot**: External uptime monitoring
- **Prometheus + Grafana**: Metrics and dashboards
- **Sentry**: Error tracking
- **Papertrail**: Log aggregation

---

## Troubleshooting

### Server Won't Start

**Check port availability**:

```bash
# Check if port is in use
sudo lsof -i :8787
sudo netstat -tuln | grep 8787
```

**Check logs**:

```bash
# PM2
pm2 logs bluelens --err

# Systemd
sudo journalctl -u bluelens -n 50
```

### Upload Failures

**Check upload host reachability**:

```bash
curl http://localhost:8787/api/doctor/upload-reachability
```

**Common causes**:

1. Network connectivity issues
2. Upload hosts down or blocking server IP
3. Image size too large (some hosts have limits)
4. Rate limiting from upload hosts

**Solutions**:

- Configure alternative upload hosts in `bluelens-config.js`
- Check network/firewall rules
- Reduce image size before upload

### Wait Jobs Not Working

**Symptoms**: Wait tabs stuck at "Waiting for upload..."

**Check**:

1. Server is running and accessible
2. No CORS issues (check browser console)
3. Wait job timeout settings in config

**Debug**:

```bash
# Check active jobs
curl http://localhost:8787/api/wait-jobs/[job-id]
```

### High Memory Usage

**Check memory**:

```bash
# PM2
pm2 show bluelens

# System
free -h
ps aux | grep node
```

**Common causes**:

1. Large images being processed
2. Memory leaks in long-running processes
3. Too many concurrent uploads

**Solutions**:

- Restart the service regularly (cron job)
- Add memory limit to PM2: `pm2 start server.js --max-memory-restart 500M`
- Enable swap if needed

### CDN Resources Not Loading

**Check CDN reachability**:

```bash
curl http://localhost:8787/api/doctor/cdn-reachability
```

**Common causes**:

1. Network/firewall blocking CDN domains
2. Corporate proxy interfering
3. DNS issues

**Solutions**:

- Check DNS resolution: `nslookup cdn.jsdelivr.net`
- Configure proxy if needed
- Whitelist CDN domains in firewall

### Performance Issues

**Symptoms**: Slow responses, timeouts

**Check**:

1. Server resource usage (CPU, RAM, disk)
2. Network latency
3. Upload host performance

**Optimize**:

```bash
# Enable compression in nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Increase worker processes
worker_processes auto;
```

---

## Security Considerations

1. **Firewall**: Only expose port 80/443 (nginx) or 8787 (direct) to internet
2. **Rate Limiting**: Use nginx rate limiting for additional protection
3. **Updates**: Keep Node.js and dependencies updated
4. **HTTPS**: Always use SSL/TLS in production
5. **Logs**: Rotate and monitor logs for suspicious activity
6. **Private IPs**: Server blocks private IP fetching by default (don't enable in production)

---

## Backup and Recovery

**What to backup**:

- Application logs (if important)
- Configuration files (if customized)
- Wait job store: `/tmp/bluelens-wait-jobs-v1.json` (ephemeral, low priority)

**Backup script example**:

```bash
#!/bin/bash
BACKUP_DIR=/backup/bluelens/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR
cp /var/log/bluelens/app.log $BACKUP_DIR/
cp /home/bluelens/bluelens/bluelens-config.js $BACKUP_DIR/
```

**Recovery**:
Simply redeploy from git and restore configuration if customized.

---

## Scaling

BlueLens is designed for single-instance deployment but can be scaled:

1. **Horizontal Scaling**: Multiple instances behind load balancer (note: wait jobs are instance-local)
2. **Vertical Scaling**: Increase server resources (CPU/RAM)
3. **CDN**: Serve static assets via CDN
4. **Caching**: Add Redis for shared wait job state (requires code changes)

---

## Support

- **GitHub Issues**: https://github.com/potemkin666/bluelens/issues
- **Documentation**: `/docs` folder in repository
- **Configuration**: See `bluelens-config.js` for all settings
