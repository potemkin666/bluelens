# BlueLens Documentation

This folder contains development and deployment documentation for BlueLens.

## Documentation Files

### [ARCHITECTURE.md](./ARCHITECTURE.md)

- System architecture overview
- Component descriptions (client, server, helpers)
- Data flow diagrams
- Storage mechanisms
- Security considerations
- Extension points for adding engines and hosts
- Performance characteristics
- Dependencies

### [API.md](./API.md)

- Server API endpoints documentation
  - Health & status endpoints
  - Upload proxy API
  - Wait job management API
  - Acquisition layer API
  - Doctor/health check endpoints
- Client-side JavaScript API
- Rate limits and error codes
- Environment variables

### [DEPLOYMENT.md](./DEPLOYMENT.md)

- Local development setup
- Production deployment options
  - Direct Node.js deployment
  - Systemd service configuration
  - Nginx reverse proxy setup
  - SSL/TLS with Let's Encrypt
- Docker deployment
  - Dockerfile
  - Docker Compose
- Monitoring and logging
- Troubleshooting guide
- Security considerations
- Backup and recovery

### [MODULARIZATION.md](./MODULARIZATION.md)

- Code organization notes
- Rationale for not splitting large files yet
- Future modularization strategy
- Migration approach for app.js and server.js
- Current mitigation strategies
- When to revisit splitting decisions

## Quick Links

### For Developers

- Start with [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
- See [API.md](./API.md) for endpoint and function documentation
- Review [MODULARIZATION.md](./MODULARIZATION.md) before making structural changes

### For Operators

- See [DEPLOYMENT.md](./DEPLOYMENT.md) for installation and configuration
- Reference [API.md](./API.md) for API endpoints and environment variables

### For Contributors

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
- Check [MODULARIZATION.md](./MODULARIZATION.md) for code organization philosophy
- Follow the development workflow in [DEPLOYMENT.md](./DEPLOYMENT.md#local-development)

## Contributing to Documentation

When updating documentation:

1. Keep documentation accurate and up-to-date with code changes
2. Use clear, concise language
3. Include code examples where helpful
4. Update this README if adding new documentation files
5. Use Markdown formatting consistently

## Documentation Standards

- Use Markdown for all documentation
- Include code blocks with language hints
- Add links between related documentation sections
- Keep line length reasonable (80-120 characters)
- Use headers for clear section organization
