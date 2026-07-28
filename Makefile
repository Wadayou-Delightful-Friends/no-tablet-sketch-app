.PHONY: dev dev-client dev-server install

# クライアント + シグナリングサーバを同時に起動する
dev:
	@echo "starting client & signaling-server (Ctrl-C to stop)"
	@trap 'kill 0' INT TERM EXIT; \
	pnpm dev --host & \
	pnpm --dir signaling-server dev --host & \
	wait

# クライアントのみ
dev-client:
	pnpm dev --host

# シグナリングサーバのみ
dev-server:
	pnpm --dir signaling-server dev --host

# 依存関係のインストール
install:
	pnpm install
	pnpm --dir signaling-server install
