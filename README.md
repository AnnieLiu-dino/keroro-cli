# 🐸 Keroro CLI

A **monorepo-based** command-line tool for dynamic command execution and interactive project scaffolding — ideal for medium to large-scale development workflows.

## 📦 Installation

Install Keroro CLI globally using npm:

```bash
npm install -g @keroro-cli/core
```

## 🚀 Quick Start

To create a new project:

```bash
keroro-cli create
```

## 📘 Commands and Options

### Global Options

| Option                | Description              | Default |
| --------------------- | ------------------------ | ------- |
| `-d, --debug`         | Enable verbose logs      | `false` |
| `-lp, --cmdLocalPath` | Local command debug path | `''`    |

### Command: `create`

Used to scaffold a new project.

```bash
keroro-cli create [options]
```

#### Options:

| Option        | Description                                  |
| ------------- | -------------------------------------------- |
| `-f, --force` | Force project creation (overwrite if exists) |

## 🧩 Features

- 🧱 **Monorepo structure** for scalable package management
- ⚙️ **Dynamic command execution** with local path support
- 💬 **Interactive prompts** for user-friendly CLI workflows

## 🛠 Examples

```bash
# Create a project
keroro-cli create

# Enable debug mode
keroro-cli create --debug
```
