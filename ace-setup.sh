#!/usr/bin/env bash
# ace-setup.sh — polyglot toolchain bootstrap + build for the NetSuite-like mini-ERP starter.
#
# Runs as instance_init.setup_script (first in the pre-services chain), BEFORE
# ace-engine starts any service. The golden image ships Node only, so this
# installs JDK 21 + Maven *user-local* (no sudo) on demand, ensures pnpm, then
# builds every service so their start commands have artifacts to run:
#   - erp-core  -> services/erp-core/target/erp-core.jar  (java -jar ...)
#   - reporting -> services/reporting/dist/main.js        (node dist/main)
#   - frontend  -> services/frontend/dist                 (npx serve -s dist)
# Idempotent: safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
log()  { printf '\033[1;36m[ace-setup]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[ace-setup][warn]\033[0m %s\n' "$*" >&2; }
have() { command -v "$1" >/dev/null 2>&1; }

LOCAL="$HOME/.local"
TOOLENV="$HOME/.ace-toolchains.env"
mkdir -p "$LOCAL"
: >"$TOOLENV.tmp"

# Detect arch for tarball downloads (Temurin / Maven naming).
UNAME_M="$(uname -m)"
case "$UNAME_M" in
  x86_64|amd64) JDK_ARCH="x64" ;;
  aarch64|arm64) JDK_ARCH="aarch64" ;;
  *) JDK_ARCH="x64"; warn "unknown arch '$UNAME_M', defaulting to x64" ;;
esac
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"   # linux / darwin

# --- Node / pnpm -----------------------------------------------------------
if ! have pnpm; then
  log "enabling pnpm via corepack"
  corepack enable >/dev/null 2>&1 || npm i -g pnpm@9.15.0 || warn "could not install pnpm"
fi
have pnpm && log "pnpm: $(pnpm -v)"
# Persist pnpm/node dir so `ace run` (clean shell) can resolve them via the
# toolchain env. corepack shims live next to node; record their location.
if have pnpm; then
  echo "export PATH=\"$(dirname "$(command -v pnpm)"):\$PATH\"" >>"$TOOLENV.tmp"
fi
if have node; then
  echo "export PATH=\"$(dirname "$(command -v node)"):\$PATH\"" >>"$TOOLENV.tmp"
fi

# --- JDK 21 (user-local Temurin tarball, no sudo) --------------------------
JDK_HOME=""
if have java; then
  log "java present: $(java -version 2>&1 | head -1)"
else
  JDK_DIR="$LOCAL/jdk-21"
  if [[ -x "$JDK_DIR/bin/java" ]]; then
    JDK_HOME="$JDK_DIR"
  elif [[ "$OS" == "linux" ]]; then
    log "installing Temurin JDK 21 (user-local) for linux/$JDK_ARCH"
    url="https://api.adoptium.net/v3/binary/latest/21/ga/linux/${JDK_ARCH}/jdk/hotspot/normal/eclipse?project=jdk"
    tmp="$(mktemp -d)"
    if curl -fsSL "$url" -o "$tmp/jdk.tgz"; then
      mkdir -p "$JDK_DIR"
      tar -xzf "$tmp/jdk.tgz" -C "$JDK_DIR" --strip-components=1
      JDK_HOME="$JDK_DIR"
    else
      warn "JDK download failed; erp-core build will be skipped"
    fi
    rm -rf "$tmp"
  else
    warn "no java and non-linux host ($OS); install JDK 21 manually for local dev"
  fi
fi
if [[ -n "$JDK_HOME" ]]; then
  export JAVA_HOME="$JDK_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
  echo "export JAVA_HOME=\"$JDK_HOME\"" >>"$TOOLENV.tmp"
  echo "export PATH=\"$JDK_HOME/bin:\$PATH\"" >>"$TOOLENV.tmp"
fi
have java && log "java: $(java -version 2>&1 | head -1)"

# --- Maven (user-local Apache tarball, no sudo) ----------------------------
if ! have mvn; then
  MVN_VER="3.9.9"
  MVN_DIR="$LOCAL/apache-maven-$MVN_VER"
  if [[ -x "$MVN_DIR/bin/mvn" ]]; then
    :
  else
    log "installing Apache Maven $MVN_VER (user-local)"
    url="https://archive.apache.org/dist/maven/maven-3/$MVN_VER/binaries/apache-maven-$MVN_VER-bin.tar.gz"
    tmp="$(mktemp -d)"
    if curl -fsSL "$url" -o "$tmp/mvn.tgz"; then
      tar -xzf "$tmp/mvn.tgz" -C "$LOCAL"
    else
      warn "Maven download failed; erp-core build will be skipped"
    fi
    rm -rf "$tmp"
  fi
  if [[ -x "$MVN_DIR/bin/mvn" ]]; then
    export PATH="$MVN_DIR/bin:$PATH"
    echo "export PATH=\"$MVN_DIR/bin:\$PATH\"" >>"$TOOLENV.tmp"
  fi
fi
have mvn && log "mvn: $(mvn -v 2>&1 | head -1)"

# Persist toolchain env for later lifecycle steps / shells.
mv -f "$TOOLENV.tmp" "$TOOLENV"

# --- install JS deps -------------------------------------------------------
log "pnpm install (workspace)"
pnpm install --no-frozen-lockfile || warn "pnpm install reported issues"

# --- build services so start commands have artifacts -----------------------
log "building reporting (NestJS)"
pnpm run build:reporting || warn "reporting build failed"

log "building frontend (Vite)"
pnpm run build:frontend || warn "frontend build failed"

if have mvn && have java; then
  log "building erp-core (mvn package)"
  mvn -q -f services/erp-core/pom.xml -DskipTests package || warn "erp-core build failed"
  # ace.json expects a stable jar name (erp-core.jar). finalName already does
  # this, but copy any fallback just in case the layout differs.
  if [[ ! -f services/erp-core/target/erp-core.jar ]]; then
    jar="$(ls -1 services/erp-core/target/*.jar 2>/dev/null | grep -v 'original' | head -1 || true)"
    [[ -n "$jar" ]] && cp -f "$jar" services/erp-core/target/erp-core.jar || true
  fi
else
  warn "java/mvn unavailable; skipped erp-core build (jar must exist before service start)"
fi

log "setup complete"
