#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    python3 \
    python3-pip

if ! command -v uv >/dev/null 2>&1; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

export PATH="$HOME/.local/bin:$PATH"
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

uv tool install specify-cli --from git+https://github.com/github/spec-kit.git --force
uv run --with gepa --with litellm python -c "import gepa, litellm; print('Sensei GEPA dependencies ready')"

sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*

echo "Installed versions:"
git --version
uv --version
specify --version
