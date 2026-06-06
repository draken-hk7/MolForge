#!/usr/bin/env bash
# Install xTB and prepare a MolForge job directory on Ubuntu cloud instances.

set -euo pipefail

XTB_VERSION="${XTB_VERSION:-6.7.1}"
ARCHIVE="xtb-${XTB_VERSION}-linux-x86_64.tar.xz"
DOWNLOAD_URL="https://github.com/grimme-lab/xtb/releases/download/v${XTB_VERSION}/${ARCHIVE}"
INSTALL_ROOT="/opt/molforge/xtb-${XTB_VERSION}"
JOB_ROOT="${HOME}/molforge_jobs"

sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git libgomp1 python3-pip wget xz-utils

workdir="$(mktemp -d)"
trap 'rm -rf "${workdir}"' EXIT

cd "${workdir}"
wget -q --show-progress "${DOWNLOAD_URL}" -O "${ARCHIVE}"
tar -xf "${ARCHIVE}"

xtb_binary="$(find "${workdir}" -type f -name xtb -perm -u+x | head -n 1)"
if [[ -z "${xtb_binary}" ]]; then
  echo "Could not locate the xTB executable in ${ARCHIVE}." >&2
  exit 1
fi

distribution_root="$(dirname "$(dirname "${xtb_binary}")")"
sudo mkdir -p "${INSTALL_ROOT}"
sudo cp -a "${distribution_root}/." "${INSTALL_ROOT}/"
sudo chmod 0755 "${INSTALL_ROOT}/bin/xtb"
sudo ln -sfn "${INSTALL_ROOT}/bin/xtb" /usr/local/bin/xtb

mkdir -p "${JOB_ROOT}"
chmod 700 "${JOB_ROOT}"

echo "MolForge cloud compute setup complete"
echo "Job directory: ${JOB_ROOT}"
xtb --version
