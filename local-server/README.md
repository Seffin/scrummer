# WorkTrack Local Server

Per-device GitHub CLI integration server for WorkTrack application.

## Purpose

Each device runs this local server to communicate with its own GitHub CLI installation, enabling true per-device authentication and repository access.

## Prerequisites

- **GitHub CLI** installed and authenticated (`gh auth login`)
- **Bun** or **Node.js** for running the server

## Installation

```bash
cd local-server
bun install
# or
npm install
```

## Usage

### Quick Start
```bash
# Windows
.\start.bat

# Mac/Linux
chmod +x start.sh
./start.sh

# Manual start
bun run index.ts
```

### Server Details
- **Port**: 3001
- **Health Check**: http://localhost:3001/health
- **Base URL**: http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/github/cli/check` - Check GitHub CLI availability
- `POST /api/github/cli/token` - Get token from device GitHub CLI
- `POST /api/github/cli/user` - Get current GitHub user info

### Data Access
- `POST /api/github/cli/orgs` - Get user organizations
- `POST /api/github/cli/repos` - Get user repositories
- `POST /api/github/cli/issues/:owner/:repo` - Get repository issues

## Security

- Only accepts requests from localhost:5173
- No token sharing between devices
- Each device uses its own GitHub CLI authentication

## Troubleshooting

### "GitHub CLI not found"
```bash
# Install GitHub CLI
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
sudo apt install gh
```

### "Not authenticated with GitHub CLI"
```bash
gh auth login
```

### Server won't start
- Check if port 3001 is available
- Ensure Bun/Node.js is installed
- Run with administrator privileges if needed

## Integration

The main WorkTrack app automatically detects if this local server is running and routes GitHub API calls to it instead of the remote server.
