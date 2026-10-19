#!/bin/bash
# One-command publish to Firebase (run in Google Cloud Shell from the repo folder): bash tools/firebase-deploy.sh
set -e
P=plate-club7
cd "$(dirname "$0")/.."
gcloud config set project $P >/dev/null 2>&1 || true
echo "== 1/5 Firebase: проверка входа"
firebase projects:list --non-interactive >/dev/null 2>&1 || firebase login --no-localhost
echo "== Включаю нужные сервисы Google (1–2 минуты)"
gcloud services enable secretmanager.googleapis.com cloudfunctions.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com eventarc.googleapis.com pubsub.googleapis.com firebasehosting.googleapis.com --project $P
echo "== 2/5 Библиотеки сервера"
(cd functions && npm install --no-audit --no-fund --silent)
echo "== 3/5 Секреты"
have() { gcloud secrets describe "$1" --project $P >/dev/null 2>&1; }
if ! have DATABASE_URL; then
  echo "Вставьте строку подключения Neon (postgresql://...) и нажмите Enter. Её не видно при вводе:"
  read -rs DBURL; echo
  printf %s "$DBURL" | firebase functions:secrets:set DATABASE_URL --project $P --data-file=- --force
else DBURL=$(gcloud secrets versions access latest --secret=DATABASE_URL --project $P); fi
have PLATE_SEAL_SECRET || openssl rand -hex 32 | tr -d '\n' | firebase functions:secrets:set PLATE_SEAL_SECRET --project $P --data-file=- --force
have ADMIN_SETUP_CODE || printf %s "${ADMIN_CODE:-PC-99c8fd2612e026e3d17b}" | firebase functions:secrets:set ADMIN_SETUP_CODE --project $P --data-file=- --force
echo "== 4/5 Таблицы в базе"
DATABASE_URL="$DBURL" node functions/migrate.js
echo "== 5/5 Публикация"
firebase deploy --only hosting,functions --project $P --non-interactive --force
echo "== Проверка"
sleep 5; curl -s -o /dev/null -w "API: %{http_code}\n" https://$P.web.app/api/config
echo "ГОТОВО: https://$P.web.app"
