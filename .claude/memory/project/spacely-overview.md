# Spacely — Visión General del Proyecto

Red social gamificada con temática espacial. Los usuarios construyen identidad digital, se vinculan con otros usuarios, juegan mini-juegos y participan en una economía virtual.

## Plataformas
- Web: Next.js 16 + Supabase (puerto auto-detect 3000-3006)
- Desktop: Tauri — icono en `src-tauri/icons/spacelyicon.png`
- Mobile: Capacitor (Android APK v1.3.6)

## Stack
- Next.js 16 + React 19 + TypeScript
- Supabase (Auth + PostgreSQL + Storage + RLS)
- Tailwind CSS 3.4
- Framer Motion + Anime.js
- Capacitor + Tauri para apps nativas

## Sistemas Core
- Economía virtual ◈ (Starlys): balance en `profiles`, ledger en `transactions`
- Stellar Pass (Battle Pass): `stellar_pass_progression`, `stellar_pass_rewards`
- Vínculos (sistema de parejas): `vinculos`, `vinculo_stats`, `vinculo_notes`, `vinculo_gallery`
- Tienda cosmética: 8 categorías → `shop_items`, `user_inventory`
- Arcade: 12 mini-juegos → `scores`, `leaderboard`
- Banco: préstamos con `check_stellar_pact_eligibility` RPC en `user_loans`
- Comunidades con canales de chat en tiempo real
- YouTube IFrame API pre-cargado via `YouTubeProvider` (contexts/YouTubeContext.jsx)
