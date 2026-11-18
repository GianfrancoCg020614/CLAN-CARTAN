#!/usr/bin/env bash
# Bound load to the loopback fixture; never use production URLs or credentials.
set -euo pipefail
[[ ${ISOLATED:-} == YES ]] || exit 2
mkdir -p artifacts/capacity-isolated
printf 'stage,exit_code,resource_stop\n' > artifacts/capacity-isolated/stages.csv
for stage in ${CAPACITY_STAGES:-10 100 500 1000 2500 5000 10000}; do
  case "$stage" in 1|10|100|500|1000|2500|5000|10000) ;; *) exit 2;; esac
  echo "Starting isolated stage: $stage VUs"
  STAGE_VUS=$stage "$K6_BIN" run --summary-export "artifacts/capacity-isolated/$stage.summary.json" tests/k6/isolated-finance.js >"artifacts/capacity-isolated/$stage.console.txt" 2>&1 &
  load_pid=$!
  (
    limit=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo max)
    [[ $limit != max ]] || limit=$(awk '/MemTotal/{printf "%.0f",$2*1024}' /proc/meminfo)
    while kill -0 "$load_pid" 2>/dev/null;do
      rss=$(ps -p "$load_pid" -o rss= | tr -d ' ' || true)
      available=$(awk '/MemAvailable/{print $2}' /proc/meminfo)
      printf '%s,%s,%s,%s\n' "$(date -u +%FT%TZ)" "$stage" "${rss:-0}" "$available" >> artifacts/capacity-isolated/resources.csv
      if (( ${rss:-0}*1024 > limit*65/100 || available < 786432 ));then
        echo "Generator memory guard stopped stage $stage" > "artifacts/capacity-isolated/$stage.resource-stop.txt"
        kill -INT "$load_pid" 2>/dev/null || true
        break
      fi
      sleep 1
    done
  ) &
  guard_pid=$!
  set +e
  wait "$load_pid";status=$?
  set -e
  kill "$guard_pid" 2>/dev/null || true
  wait "$guard_pid" 2>/dev/null || true
  resource_stop=no
  [[ ! -f artifacts/capacity-isolated/$stage.resource-stop.txt ]] || resource_stop=yes
  printf '%s,%s,%s\n' "$stage" "$status" "$resource_stop" >> artifacts/capacity-isolated/stages.csv
  # A load failure is a measured saturation result, not permission to keep increasing.
  if [[ $status != 0 || $resource_stop == yes ]];then
    echo "Stopped escalation at $stage VUs, status $status, memory guard $resource_stop."
    break
  fi
done
