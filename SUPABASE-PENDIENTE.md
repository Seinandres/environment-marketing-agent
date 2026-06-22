# Supabase — Pendiente de activar

El proyecto funciona **sin Supabase** hoy. Esta guía documenta qué falta y qué cambia cuando se active.

---

## Secrets que faltan en GitHub

Agregar en: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Descripción |
|--------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase (ej. `https://abc123.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (con permisos de storage, NO la anon key) |

---

## Qué falta configurar en Supabase

1. **Crear bucket** `marketing-assets` en Storage (público o privado según preferencia).
2. **Verificar RLS**: el service role key bypasea RLS, pero confirmar que el bucket existe.
3. **Opcional**: activar CDN en el bucket para URLs de video más rápidas.

---

## Comportamiento actual (sin Supabase)

```
render-environment-ad workflow
  ├── Genera audio TTS local (/tmp/environment-render/voiceover.mp3)
  ├── Renderiza MP4 con Remotion
  ├── Copia MP4 a remotion/out/
  └── Sube MP4 como GitHub Actions Artifact (7 días de retención)
       → Descarga manual desde: Actions > ejecución > Artifacts
```

El webhook a la app (`APP_WEBHOOK_URL`) **no se llama** sin Supabase, porque no hay URL pública de video para enviar.

---

## Comportamiento una vez activos los secrets

```
render-environment-ad workflow
  ├── Genera audio TTS local
  ├── Sube audio a Supabase Storage → obtiene URL pública
  ├── Renderiza MP4 con Remotion (usando la URL del audio)
  ├── Copia MP4 a remotion/out/ (artifact sigue subiendo siempre)
  ├── Sube MP4 a Supabase Storage → obtiene URL pública
  └── Llama webhook /api/webhooks/render-complete
       → El bot/dashboard recibe la URL y entrega el video automáticamente
```

El MP4 pasa de descarga manual a entrega automática vía Telegram o dashboard.

---

## Rate limiting / Fail-open

No hay un rate limiter dedicado a Supabase. El endpoint `POST /api/generate-video`:
- Falla abierto si `GITHUB_TOKEN` o `GITHUB_REPO` no están configurados (solo loguea warning).
- El render en GitHub Actions falla abierto respecto a Supabase (corre igual, solo cambia el destino del MP4).
