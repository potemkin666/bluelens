# Contributing to BlueLens

Thank you for your interest in contributing to BlueLens! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and constructive in all interactions with the community. We aim to maintain a welcoming environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 18 or later (Node.js 20 recommended)
- Git
- A code editor (VS Code, Sublime, etc.)

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/bluelens.git
   cd bluelens
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Run the Development Server**

   ```bash
   npm start
   ```

   Then open http://localhost:8787 in your browser.

4. **Run Tests**
   ```bash
   npm test
   ```

## Development Workflow

### Before Making Changes

1. Create a new branch for your work:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make sure all tests pass:
   ```bash
   npm test
   ```

### Making Changes

1. **Write Quality Code**
   - Follow the existing code style and conventions
   - Keep functions focused and reasonably sized
   - Add comments for complex logic
   - Use meaningful variable and function names

2. **Code Style**
   - We use ESLint and Prettier for code formatting
   - Run linting before committing:
     ```bash
     npm run lint
     npm run format:check
     ```
   - Auto-fix issues when possible:
     ```bash
     npm run lint:fix
     npm run format
     ```

3. **Testing**
   - Add tests for new features
   - Update existing tests if behavior changes
   - Ensure all tests pass: `npm test`
   - Check test coverage: `npm run test:coverage`

4. **Documentation**
   - Update relevant documentation in the `docs/` folder
   - Update README.md if adding user-facing features
   - Add JSDoc comments for new functions

### Commit Messages

Write clear, descriptive commit messages:

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Keep the first line under 72 characters
- Add detailed description if needed after a blank line

Examples:

```
Add OCR confidence threshold configuration

Allow users to configure minimum confidence level for OCR text extraction
via the bluelens-config.js file. Defaults to 60% confidence.
```

### Pull Requests

1. **Before Submitting**
   - Ensure all tests pass
   - Run linting and fix any issues
   - Update documentation
   - Rebase on the latest main branch if needed

2. **PR Description**
   - Clearly describe what the PR does
   - Reference any related issues (e.g., "Fixes #123")
   - Include screenshots for UI changes
   - List any breaking changes

3. **Review Process**
   - Respond to feedback constructively
   - Make requested changes in new commits (don't force-push during review)
   - Once approved, we may squash commits when merging

## Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue` - these are suitable for newcomers.

### High-Priority Areas

- **Testing**: Improve test coverage for edge cases
- **Documentation**: Enhance user guides and API documentation
- **Accessibility**: Improve keyboard navigation and screen reader support
- **Performance**: Optimize large file handling and OCR processing
- **Modularization**: Help break down large files (especially `app.js`)

### Feature Requests

Before implementing a new feature:

1. Check if an issue exists for it
2. If not, create a feature request issue
3. Discuss the approach with maintainers
4. Wait for approval before starting significant work

## Project Structure

```
bluelens/
├── app.js              # Main frontend application logic
├── server.js           # Local HTTP server
├── index.html          # Main UI
├── styles.css          # UI styling
├── bluelens-config.js  # Configuration
├── bluelens-helpers.js # Utility functions
├── ocr-pipeline.js     # OCR processing
├── ocr-entities-ui.js  # Entity extraction UI
├── osint-lib.js        # OSINT search engine integration
├── launchpad-core.js   # Search engine launcher
├── logger.js           # Logging utilities
├── test/               # Test files
├── docs/               # Documentation
└── assets/             # Static assets
```

## Coding Conventions

### JavaScript

- Use `const` and `let`, not `var`
- Prefer arrow functions for callbacks
- Use template literals for string interpolation
- Destructure objects when accessing multiple properties
- Use optional chaining (`?.`) for safe property access

### Naming

- `camelCase` for variables and functions
- `PascalCase` for classes
- `UPPER_SNAKE_CASE` for constants
- Prefix unused variables with underscore (`_variable`)

### Comments

- Use `//` for single-line comments
- Use `/* */` for multi-line comments
- Add JSDoc comments for public functions
- Explain "why" not "what" in comments

## Getting Help

- **Questions**: Open a discussion on GitHub
- **Bugs**: Create an issue with reproduction steps
- **Features**: Create a feature request issue
- **Security**: See SECURITY.md for reporting vulnerabilities

## License

By contributing to BlueLens, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to BlueLens! 🌊
