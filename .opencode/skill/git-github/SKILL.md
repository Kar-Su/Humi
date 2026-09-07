---
name: git-github
description: Workflow Git & GitHub proyek Humi — model branching (main PR-only, developer sebagai branch kerja), aturan squash merge, pola gh CLI, dan batasan operasi yang boleh dilakukan agent. Gunakan SETIAP KALI melakukan commit, push, merge, PR, operasi branch, atau apa pun yang menyentuh remote.
---

# Git & GitHub Workflow

## Branch Model

```
main        ← HANYA lewat Pull Request (squash). Tidak pernah ada push/merge langsung.
developer   ← branch kerja utama; semua commit harian di sini.
feat/<topik> ← untuk pekerjaan besar/berisiko; PR balik ke developer (dua tingkat).
fix/<topik>  ← idem untuk perbaikan.
```

## Alur Harian

1. Kerjakan & commit di `developer` (Conventional Commits).
2. `git push origin developer`.
3. Buka PR `developer → main`: `gh pr create --base main --head developer`.
4. Merge dengan **squash**: `gh pr merge --squash` — 1 PR = 1 commit bersih di main.
5. Sinkronkan kembali: `git checkout developer && git pull origin main` (atau fetch+rebase).

## Aturan Keras untuk Agent

- LARANG push / merge / commit langsung ke `main` — hanya via PR.
- LARANG `git push --force` ke branch shared (`main`, `developer`); force hanya ke
  branch feature milik sendiri dan SETELAH konfirmasi.
- TANYA sebelum operasi destruktif: rebase, reset --hard, branch -D.
- Jangan commit: `.env`, berkas model (*.vrm/*.pth/*.ckpt), cache, node_modules
  (sudah dicakup .gitignore — tetap cek `git status` sebelum add).
- Pesan Commit harus bahasa inggris

## Pola gh CLI

```bash
gh pr create --base main --head developer --title "..." --body "..."
gh pr merge --squash --delete-branch=false
gh repo view --web                      # buka repo di browser
gh api repos/Kar-Su/Humi/branches       # inspeksi via API
```

## Catatan Proteksi Branch

Repo private pada plan Free umumnya tidak mendukung ruleset proteksi resmi. Fallback:
disiplin konvensi di atas (agent melarang dirinya menyentuh main langsung). Begitu repo
publik atau upgrade plan, aktifkan protection resmi:

```bash
gh api repos/Kar-Su/Humi/branches/main/protection -X PUT \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -F allow_force_pushes=false -F allow_deletions=false -F required_linear_history=true
```
