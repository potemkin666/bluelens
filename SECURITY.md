# Security Policy

## Supported Versions

BlueLens is currently in active development. Security updates will be provided for the latest version.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in BlueLens, please report it responsibly:

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Send a detailed report to the repository maintainers via:
   - GitHub Security Advisories (preferred): Use the "Security" tab → "Report a vulnerability"
   - Or create a private security advisory

### What to Include

Please include the following information in your report:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity assessment
- Any suggested fixes or mitigations (if available)
- Your contact information for follow-up questions

### Response Timeline

- **Acknowledgment**: We aim to acknowledge receipt of your vulnerability report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Updates**: We will keep you informed of progress toward a fix
- **Disclosure**: We will work with you to coordinate responsible disclosure after a fix is available

### Security Best Practices

When using BlueLens:

- Keep your Node.js environment up to date (Node.js 18 or later required)
- Review uploaded images to ensure they don't contain sensitive information before sharing externally
- Be cautious when using the acquisition layer features with untrusted URLs
- Regularly update dependencies by running `npm update`
- Use the local-first approach to keep sensitive image analysis offline when possible

## Security Features

BlueLens is designed with security in mind:

- **Local-first processing**: Image analysis happens locally by default
- **No automatic uploads**: Images are only uploaded when you explicitly choose to
- **Configurable upload hosts**: Control which services are used for image uploads
- **Rate limiting**: Built-in rate limiting for acquisition layer requests
- **Content Security Policy**: Frontend implements CSP headers (when served via the local server)

Thank you for helping keep BlueLens and its users secure!
