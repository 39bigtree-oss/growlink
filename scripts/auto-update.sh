#!/bin/bash
#
# 自動更新スクリプト — Tab 3 でこれを動かしておけば、ターミナル操作ほぼゼロになります。
#
# 使い方:
#   1. 新しいターミナルタブを開く
#   2. このコマンドを 1 回だけ実行:
#        cd ~/growlink && bash scripts/auto-update.sh
#   3. そのまま放置 (閉じない)
#
# 何をしてくれるか:
#   - GitHub に新しい変更が来たら 30 秒以内に自動 git pull
#   - pnpm prisma generate と migrate deploy を自動実行
#   - Tab 2 の pnpm dev は HMR で自動再読込
#   - 結果: Chrome を更新すれば常に最新が見える
#
# 終わらせたい時: Ctrl + C で止めれば OK

set -u  # 未定義変数で停止

POLL_INTERVAL=30  # 30 秒ごとに GitHub をチェック
BRANCH="main"

echo "==================================="
echo "  Tsumugi 自動更新スクリプト 起動"
echo "==================================="
echo ""
echo "  監視対象: origin/$BRANCH"
echo "  チェック間隔: ${POLL_INTERVAL} 秒"
echo "  停止方法: Ctrl + C"
echo ""

cd "$(dirname "$0")/.." || {
  echo "❌ growlink ディレクトリに移動できません"
  exit 1
}

while true; do
  # GitHub から最新情報を取得
  if ! git fetch origin "$BRANCH" --quiet 2>&1; then
    echo "[$(date '+%H:%M:%S')] ⚠️ git fetch 失敗 (ネットワーク?)。${POLL_INTERVAL} 秒後に再試行"
    sleep "$POLL_INTERVAL"
    continue
  fi

  LOCAL=$(git rev-parse "$BRANCH" 2>/dev/null || echo "none")
  REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "none")

  if [ "$LOCAL" = "$REMOTE" ]; then
    # 変更なし、静かに待つ
    sleep "$POLL_INTERVAL"
    continue
  fi

  echo ""
  echo "[$(date '+%H:%M:%S')] 🔔 新しい変更を検知!"
  echo "  ローカル: ${LOCAL:0:8}"
  echo "  リモート: ${REMOTE:0:8}"
  echo ""

  # 念のため main にいることを確認
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$current_branch" != "$BRANCH" ]; then
    echo "[$(date '+%H:%M:%S')] ⚠️ 現在のブランチが $BRANCH ではない ($current_branch)。スキップ"
    sleep "$POLL_INTERVAL"
    continue
  fi

  # ローカル変更があれば一旦退避
  if ! git diff-index --quiet HEAD --; then
    echo "[$(date '+%H:%M:%S')] ⚠️ ローカル未保存変更あり。stash で退避します"
    git stash push -m "auto-update $(date '+%Y%m%d-%H%M%S')"
  fi

  # pull
  if git pull origin "$BRANCH" --ff-only 2>&1 | tail -5; then
    echo "[$(date '+%H:%M:%S')] ✅ git pull 完了"
  else
    echo "[$(date '+%H:%M:%S')] ❌ git pull 失敗。ログ確認してください"
    sleep "$POLL_INTERVAL"
    continue
  fi

  # Prisma 関連を更新 (環境変数を読むため .env を最新化)
  if [ -f .env.local ]; then
    cp .env.local .env
  fi

  echo "[$(date '+%H:%M:%S')] 🔄 Prisma 生成中..."
  if ! pnpm prisma generate 2>&1 | tail -3; then
    echo "[$(date '+%H:%M:%S')] ⚠️ prisma generate 失敗"
  fi

  echo "[$(date '+%H:%M:%S')] 🔄 マイグレーション適用中..."
  if ! pnpm prisma migrate deploy 2>&1 | tail -5; then
    echo "[$(date '+%H:%M:%S')] ⚠️ migrate deploy 失敗"
  fi

  echo ""
  echo "[$(date '+%H:%M:%S')] 🎉 更新完了!"
  echo "  Chrome をリロード (Ctrl+Shift+R) すると最新が見られます"
  echo ""
  echo "  最新コミット:"
  git log -1 --pretty="    %h | %s"
  echo ""

  sleep "$POLL_INTERVAL"
done
