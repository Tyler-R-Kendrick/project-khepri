#!/bin/bash


# Update package lists
sudo apt update

# Install additional dependencies
sudo apt install -y \
    curl
sdk install doctoolchain

# Clean up
sudo apt clean

# Verify installations
echo "Installed versions:"
curl --version
