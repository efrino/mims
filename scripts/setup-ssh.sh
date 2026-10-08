#!/usr/bin/env bash
# One-time SSH setup so scripts/deploy-fe.sh can reach server 67 without a password.
#
# Usage:
#   npm run ssh:setup                            # default host root@192.168.10.67
#   bash scripts/setup-ssh.sh user@other-host    # another host
#
# Steps (each skipped when already done):
#   1. passwordless SSH already works -> nothing to do
#   2. create ~/.ssh/id_ed25519 without passphrase (deploy runs in BatchMode)
#   3. append the public key to the server's authorized_keys (asks the server
#      password ONCE; the key is not added twice)
#   4. verify passwordless login
set -euo pipefail

HOST="${1:-root@192.168.10.67}"
KEY="$HOME/.ssh/id_ed25519"
BATCH=(-o BatchMode=yes -o ConnectTimeout=10)

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

command -v ssh >/dev/null || fail "ssh not found. Install Git for Windows (includes OpenSSH) and run this from Git Bash or npm."

# 1. Already working?
if ssh "${BATCH[@]}" -o StrictHostKeyChecking=accept-new "$HOST" true 2>/dev/null; then
  ok "SSH to $HOST already works without a password. Nothing to do."
  exit 0
fi

# 2. Key
mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
if [[ -f "$KEY.pub" ]]; then
  log "Using existing key $KEY.pub"
else
  log "Creating SSH key $KEY (no passphrase)"
  comment="$(git config user.email 2>/dev/null || whoami)@$(hostname)"
  ssh-keygen -t ed25519 -N "" -f "$KEY" -C "$comment" >/dev/null
  ok "Key created. Never share $KEY (private key)."
fi

# 3. Install public key on the server (password prompt appears once)
log "Installing public key on $HOST"
echo "Enter the password of $HOST when asked. No password? Send the content of"
echo "$KEY.pub to a teammate who already has access, then run this again."
ssh -o StrictHostKeyChecking=accept-new "$HOST" \
  'mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && read -r k &&
   { grep -qxF "$k" ~/.ssh/authorized_keys || echo "$k" >> ~/.ssh/authorized_keys; } &&
   chmod 600 ~/.ssh/authorized_keys' < "$KEY.pub" \
  || fail "Could not install the key (wrong password or server unreachable)."

# 4. Verify
log "Verifying passwordless login"
ssh "${BATCH[@]}" "$HOST" true || fail "Passwordless login still fails. Check that $KEY.pub is in $HOST:~/.ssh/authorized_keys."
ok "Done. You can now deploy with: npm run deploy:67"
