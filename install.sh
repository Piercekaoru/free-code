#!/usr/bin/env bash
set -euo pipefail

# ArcBytecode installer
# Usage: curl -fsSL https://raw.githubusercontent.com/Piercekaoru/free-code/main/install.sh | bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

REPO_OWNER="Piercekaoru"
REPO_NAME="free-code"
REPO="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
INSTALL_DIR="${ARC_INSTALL_DIR:-$HOME/.arcbytecode}"
BIN_DIR="${ARC_BIN_DIR:-$HOME/.local/bin}"
BIN_NAME="arc"
BUN_MIN_VERSION="1.3.11"

info()  { printf "${CYAN}[*]${RESET} %s\n" "$*"; }
ok()    { printf "${GREEN}[+]${RESET} %s\n" "$*"; }
warn()  { printf "${YELLOW}[!]${RESET} %s\n" "$*"; }
fail()  { printf "${RED}[x]${RESET} %s\n" "$*"; exit 1; }

header() {
  echo ""
  printf "${BOLD}${CYAN}"
  cat << 'ART'
    _             ____        _                 _
   / \   _ __ ___| __ ) _   _| |_ ___  ___ ___ | | ___
  / _ \ | '__/ __|  _ \| | | | __/ _ \/ __/ _ \| |/ _ \
 / ___ \| | | (__| |_) | |_| | ||  __/ (_| (_) | |  __/
/_/   \_\_|  \___|____/ \__, |\__\___|\___\___/|_|\___|
                         |___/
ART
  printf "${RESET}"
  printf "${DIM}  ArcBytecode CLI${RESET}\n"
  echo ""
}

detect_platform() {
  local os arch
  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    *) fail "Unsupported OS: $(uname -s). macOS or Linux required." ;;
  esac

  case "$(uname -m)" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64) arch="x64" ;;
    *) arch="unsupported" ;;
  esac

  PLATFORM="${os}-${arch}"
  ASSET_NAME="${BIN_NAME}-${PLATFORM}"
  ok "Platform: ${PLATFORM}"
}

release_url() {
  local version="${ARC_VERSION:-${FREE_CODE_VERSION:-latest}}"
  if [ "$version" = "latest" ]; then
    printf "https://github.com/%s/%s/releases/latest/download/%s" "$REPO_OWNER" "$REPO_NAME" "$ASSET_NAME"
  else
    printf "https://github.com/%s/%s/releases/download/%s/%s" "$REPO_OWNER" "$REPO_NAME" "$version" "$ASSET_NAME"
  fi
}

install_from_release() {
  if [ "${FREE_CODE_INSTALL_FROM_SOURCE:-${ARC_INSTALL_FROM_SOURCE:-}}" = "1" ]; then
    warn "Source install requested; skipping release download"
    return 1
  fi

  case "$PLATFORM" in
    darwin-arm64|darwin-x64|linux-x64) ;;
    *)
      warn "No prebuilt release asset for ${PLATFORM}; falling back to source build"
      return 1
      ;;
  esac

  local url tmp
  url="$(release_url)"
  tmp="$(mktemp)"

  info "Downloading ${ASSET_NAME}"
  if ! curl -fL --progress-bar "$url" -o "$tmp"; then
    rm -f "$tmp"
    warn "Release download failed; falling back to source build"
    return 1
  fi

  mkdir -p "$BIN_DIR"
  install -m 0755 "$tmp" "$BIN_DIR/$BIN_NAME"
  rm -f "$tmp"
  ok "Installed: $BIN_DIR/$BIN_NAME"
  return 0
}

check_git() {
  if ! command -v git &>/dev/null; then
    fail "git is required for source install.
    macOS:  xcode-select --install
    Linux:  sudo apt install git  (or your distro's equivalent)"
  fi
  ok "git: $(git --version | head -1)"
}

version_gte() {
  awk -v current="$1" -v required="$2" '
    BEGIN {
      split(current, c, ".")
      split(required, r, ".")
      for (i = 1; i <= 3; i++) {
        cv = c[i] + 0
        rv = r[i] + 0
        if (cv > rv) exit 0
        if (cv < rv) exit 1
      }
      exit 0
    }
  '
}

install_bun() {
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  if ! command -v bun &>/dev/null; then
    fail "bun installation succeeded but binary was not found on PATH.
    Add this to your shell profile and restart:
      export PATH=\"\$HOME/.bun/bin:\$PATH\""
  fi
  ok "bun: v$(bun --version) (just installed)"
}

check_bun() {
  if command -v bun &>/dev/null; then
    local ver
    ver="$(bun --version 2>/dev/null || echo "0.0.0")"
    if version_gte "$ver" "$BUN_MIN_VERSION"; then
      ok "bun: v${ver}"
      return
    fi
    warn "bun v${ver} found but v${BUN_MIN_VERSION}+ required. Upgrading..."
  else
    info "bun not found. Installing..."
  fi
  install_bun
}

clone_repo() {
  if [ -d "$INSTALL_DIR" ]; then
    warn "$INSTALL_DIR already exists"
    if [ -d "$INSTALL_DIR/.git" ]; then
      info "Pulling latest changes..."
      git -C "$INSTALL_DIR" pull --ff-only origin main 2>/dev/null || {
        warn "Pull failed, continuing with existing copy"
      }
    fi
  else
    info "Cloning repository..."
    git clone --depth 1 "$REPO" "$INSTALL_DIR"
  fi
  ok "Source: $INSTALL_DIR"
}

build_from_source() {
  check_git
  check_bun
  clone_repo

  info "Installing dependencies..."
  cd "$INSTALL_DIR"
  bun install --frozen-lockfile 2>/dev/null || bun install

  info "Building ArcBytecode (all experimental features enabled)..."
  bun run build:dev:full

  mkdir -p "$BIN_DIR"
  ln -sf "$INSTALL_DIR/cli-dev" "$BIN_DIR/$BIN_NAME"
  ok "Symlinked: $BIN_DIR/$BIN_NAME"
}

print_path_hint() {
  if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
    warn "$BIN_DIR is not on your PATH"
    echo ""
    printf "${YELLOW}  Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):${RESET}\n"
    printf "${BOLD}    export PATH=\"%s:\$PATH\"${RESET}\n" "$BIN_DIR"
    echo ""
  fi
}

header
info "Starting installation..."
echo ""

detect_platform
install_from_release || build_from_source
print_path_hint

echo ""
printf "${GREEN}${BOLD}  Installation complete!${RESET}\n"
echo ""
printf "  ${BOLD}Run it:${RESET}\n"
printf "    ${CYAN}arc${RESET}                          # interactive REPL\n"
printf "    ${CYAN}arc -p \"your prompt\"${RESET}          # one-shot mode\n"
echo ""
printf "  ${BOLD}Authenticate:${RESET}\n"
printf "    ${CYAN}arc /login${RESET}\n"
echo ""
printf "  ${DIM}Command: $BIN_DIR/$BIN_NAME${RESET}\n"
printf "  ${DIM}Source fallback: $INSTALL_DIR${RESET}\n"
echo ""
