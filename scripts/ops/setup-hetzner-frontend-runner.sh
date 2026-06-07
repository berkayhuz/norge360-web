#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
setup_runner_usage:
  sudo bash scripts/ops/setup-hetzner-frontend-runner.sh --repo owner/name --token TOKEN [options]

setup_runner_required:
  --repo        GitHub repository in owner/name format
  --token       GitHub runner registration token

setup_runner_optional:
  --runner-name Runner name shown in GitHub Actions (default: norge360-frontend-1)
  --labels      Comma-separated runner labels (default: self-hosted,linux,x64,norge360-frontend-1)
  --runner-user Unix user that runs the runner (default: actions-runner)
  --runner-dir  Install directory for the runner (default: /opt/actions-runner)
  --version     Specific runner release tag, for example v2.327.1

The script installs Docker, downloads the GitHub Actions runner, registers it as a
service, and adds the runner user to the docker group so deploy jobs can run
docker compose on the host.
EOF
}

repo=""
token=""
runner_name="norge360-frontend-1"
labels="self-hosted,linux,x64,norge360-frontend-1"
runner_user="actions-runner"
runner_dir="/opt/actions-runner"
runner_version=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      repo="${2:-}"
      shift 2
      ;;
    --token)
      token="${2:-}"
      shift 2
      ;;
    --runner-name)
      runner_name="${2:-}"
      shift 2
      ;;
    --labels)
      labels="${2:-}"
      shift 2
      ;;
    --runner-user)
      runner_user="${2:-}"
      shift 2
      ;;
    --runner-dir)
      runner_dir="${2:-}"
      shift 2
      ;;
    --version)
      runner_version="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
    echo "setup_runner_unknown_argument_$1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$repo" || -z "$token" ]]; then
  usage
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "setup_runner_requires_root" >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl git jq tar unzip

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable --now docker

if ! getent group docker >/dev/null 2>&1; then
  groupadd docker
fi

if ! id "$runner_user" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$runner_user"
fi

usermod -aG docker "$runner_user"
mkdir -p "$runner_dir"
chown -R "$runner_user:$runner_user" "$runner_dir"

if [[ -z "$runner_version" ]]; then
  runner_version="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name')"
fi

runner_package="actions-runner-linux-x64-${runner_version#v}.tar.gz"
runner_url="https://github.com/actions/runner/releases/download/${runner_version}/${runner_package}"

cd "$runner_dir"

if [[ ! -f "$runner_package" ]]; then
  curl -fsSLO "$runner_url"
fi

tar xzf "$runner_package"

if [[ -x ./bin/installdependencies.sh ]]; then
  ./bin/installdependencies.sh
fi

chown -R "$runner_user:$runner_user" "$runner_dir"

runuser -u "$runner_user" -- ./config.sh \
  --unattended \
  --replace \
  --name "$runner_name" \
  --labels "$labels" \
  --url "https://github.com/$repo" \
  --token "$token"

./svc.sh install "$runner_user"
./svc.sh start

echo "setup_runner_ok"
echo "setup_runner_repository_$repo"
echo "setup_runner_runner_name_$runner_name"
echo "setup_runner_labels_$labels"
