COMPOSE_FILE := docker-compose.yml
GPU_FILE := docker-compose.gpu.yml
SOVITS_FILE := docker-compose.sovits.yml
MODEL ?= $(shell grep -E '^OLLAMA_MODEL=' .env 2>/dev/null | cut -d= -f2)
MODEL := $(if $(MODEL),$(MODEL),qwen3:8b)

.PHONY: help up up-gpu down logs ps status pull-models doctor audisi piper bench-tts sovits sovits-down sovits-down-ollama skor pitch

help:
	@echo "make up          — nyalakan stack (CPU-safe)"
	@echo "make up-gpu      — nyalakan dengan reservasi GPU untuk Ollama"
	@echo "make build       — build container"
	@echo "make down        — matikan stack"
	@echo "make logs        — ikuti log semua layanan"
	@echo "make ps          — daftar container"
	@echo "make status      — kesehatan layanan + GPU"
	@echo "make pull-models — unduh $(MODEL) ke volume Ollama"
	@echo "make doctor      — cek prasyarat lingkungan"
	@echo "--- benchmark TTS ---"
	@echo "make audisi [ARGS=\"gadis ardi\"] — dengarkan suara Wikidepia"
	@echo "make piper      — re-test Piper + skor otomatis"
	@echo "make bench-tts ENGINE=mms|piper|all"

up:
	docker compose up -d --build

up-gpu:
	docker compose -f $(COMPOSE_FILE) -f $(GPU_FILE) -f $(SOVITS_FILE) up -d

down:
	docker compose -f $(COMPOSE_FILE) -f $(GPU_FILE) -f $(SOVITS_FILE) down

build:
	docker compose -f $(COMPOSE_FILE) -f $(GPU_FILE) -f $(SOVITS_FILE) build

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

status: ps
	@echo "--- GPU ---"
	@nvidia-smi --query-gpu=name,memory.used,memory.total,temperature.gpu --format=csv,noheader 2>/dev/null || echo "nvidia-smi tidak tersedia"

pull-models:
	docker compose exec ollama ollama pull $(MODEL)
	@echo "Model aktif: $(MODEL) (lihat skill model-ops untuk opsi)"

doctor:
	@echo "== Cek lingkungan Humi =="
	@command -v docker >/dev/null && echo "OK    docker: $$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)" || echo "GAGAL docker tidak ditemukan"
	@docker compose version >/dev/null 2>&1 && echo "OK    docker compose v2" || echo "GAGAL plugin compose v2 tidak ada"
	@command -v uv >/dev/null && echo "OK    uv: $$(uv --version | cut -d' ' -f2)" || echo "INFO  uv belum terpasang (pengembangan Python di host: pacman -S uv)"
	@if command -v nvidia-smi >/dev/null; then \
		if nvidia-smi >/dev/null 2>&1; then \
			echo "OK    driver NVIDIA: $$(nvidia-smi --query-gpu=name --format=csv,noheader)"; \
		else \
			echo "RUSAK nvidia-smi gagal:"; \
			nvidia-smi 2>&1 | tail -1 | sed 's/^/      /'; \
			echo "      Umumnya driver baru dipasang namun module lama masih dimuat. Reboot lalu ulangi."; \
		fi \
	else \
		echo "INFO  nvidia-smi tidak ada (stack tetap jalan mode CPU)"; \
	fi
	@if command -v nvidia-ctk >/dev/null; then \
		echo "OK    nvidia-container-toolkit terpasang -> gunakan make up-gpu"; \
	else \
		echo "BELUM nvidia-container-toolkit (GPU di dalam Docker). Untuk CachyOS/Arch jalankan:"; \
		echo "      sudo pacman -S nvidia-container-toolkit"; \
		echo "      sudo nvidia-ctk runtime configure --runtime=docker"; \
		echo "      sudo systemctl restart docker"; \
	fi
	@docker info >/dev/null 2>&1 && echo "OK    docker daemon berjalan" || echo "GAGAL daemon docker tidak berjalan (systemctl start docker)"

# --- Benchmark TTS ---

BENCH_DIR := benchmarks

audisi:
	bash $(BENCH_DIR)/run.sh audisi $(ARGS)

piper:
	bash $(BENCH_DIR)/run.sh piper

bench-tts:
	cd $(BENCH_DIR) && uv run python bench_tts.py --engine $(or $(ENGINE),all)

sovits:
	@echo "PERINGATAN: hentikan ollama dulu bila VRAM penuh -> make sovits-down-ollama"
	docker compose -f docker-compose.sovits.yml up -d

sovits-down:
	docker compose -f docker-compose.sovits.yml down

sovits-down-ollama:
	docker compose stop ollama

skor:
	bash $(BENCH_DIR)/run.sh skor $(DIR)

pitch:
	bash $(BENCH_DIR)/run.sh pitch
