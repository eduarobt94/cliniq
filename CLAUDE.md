# Cliniq — Project Instructions

## Project Overview

Cliniq is a medical SaaS automation platform for clinics in Uruguay. Built with Vite + React + Tailwind CSS.

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS v3 with CSS custom properties (design tokens)
- **Routing:** React Router v6
- **Language:** JavaScript (JSX)

## Design System

All colors use CSS variables prefixed `--cq-*` defined in `src/styles/globals.css`. Never use hardcoded colors — always use `var(--cq-*)`.

Fonts: Geist (sans), Geist Mono, Instrument Serif (italics only).

UI primitives live in `src/components/ui/` — always import from there, never duplicate.

## Project Structure

```
src/
  components/ui/     ← Button, Badge, Card, Avatar, Icons, Typography
  pages/Landing/     ← Landing page sections
  pages/Login/       ← Login form
  pages/Dashboard/   ← Dashboard panels and blocks
  styles/globals.css ← CSS variables and base styles
  App.jsx            ← Routes
  main.jsx           ← Entry point
```

## Language

All UI copy is in **Spanish (Rioplatense / Uruguay)**. Keep it consistent.

## Superpowers Skills

This project uses Superpowers methodology. Skills are in `.claude/skills/`.

Use the `Skill` tool before starting any non-trivial task:
- New features → use `brainstorming` first
- Bug fixes → use `systematic-debugging`
- Implementation → use `test-driven-development`
- Plans → use `writing-plans` then `executing-plans`
- Before finishing → use `verification-before-completion`
