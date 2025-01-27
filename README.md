# Descope MCP Server

## Introduction

The Descope Model Context Protocol (MCP) server provides an interface to interact with Descope's Management APIs, enabling the search and retrieval of project-related information.

## Available Tools

- `search-audits`: Retrieves up to 10 audit log entries from your Descope project.

## Requirements

Before proceeding, make sure you have the following:

- [Node.js](https://nodejs.org/) (version 18 or later)
- [Claude Desktop](https://claude.ai/download) installed on your system
- A valid Descope [Project ID](https://app.descope.com/settings/project) and [Management Key](https://app.descope.com/settings/company/managementkeys)
- Git installed

To confirm your Node.js installation, run:

```bash
node --version  # Expected output: v18.0.0 or later
```

## Setup Instructions

1. Clone the repository:

    ```bash
    git clone https://github.com/descope-sample-apps/descope-mcp-server.git
    cd descope-mcp-server
    ```

2. Install the necessary dependencies:

    ```bash
    npm install
    ```

3. Build the project:

    ```bash
    npm run build
    ```

## Configuration

### 1. Configure Claude Desktop to recognize the Descope MCP server

To locate the `claude_desktop_config.json` file, open the Claude Desktop app and enable Developer Mode from the top-left menu bar.

Once enabled, go to Settings (also in the top-left menu), navigate to the Developer section, and click the Edit Config button to access and edit `claude_desktop_config.json`.

Alternatively, to open the configuration file via terminal:

#### On macOS:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

#### On Windows:

```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

### 2. Add the Descope server configuration:

```json
{
  "mcpServers": {
    "descope": {
      "command": "node",
      "args": ["/path/to/descope-mcp-server/build/index.js"],
      "env": {
        "DESCOPE_PROJECT_ID": "your-descope-project-id-here",
        "DESCOPE_MANAGEMENT_KEY": "your-descope-management-key-here"
      }
    }
  }
}
```

Replace `your-descope-project-id-here` and `your-descope-management-key-here` with your actual Descope Project ID and Management Key from [app.descope.com/settings/project](https://app.descope.com/settings/project) and [app.descope.com/settings/company/managementkeys](https://app.descope.com/settings/company/managementkeys).

### 3. Restart Claude Desktop

To apply the changes:

1. Fully quit Claude Desktop (ensure it's not just minimized).
2. Relaunch Claude Desktop.
3. Check for the 🔌 icon to confirm the Descope server is connected.