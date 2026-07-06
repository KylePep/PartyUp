# TODO

## Features

- [ ] **Push notifications for matches**
  App is installable as a PWA (manifest added). Next step: add Web Push notifications
  so users get alerted on mutual match. Requires a service worker + backend Web Push
  API integration (VAPID keys, subscription storage, notification trigger on match).
  Worth revisiting if/when exploring Flutter as an alternative delivery mechanism.

## Performance

- [ ] **Fix `DiscoverCharactersAsync` — materialize `alreadySeenIds` too early**
  `CharacterService.DiscoverCharactersAsync` calls `.ToListAsync()` on the seen-character
  query before composing the main discover query. At scale this sends thousands of GUIDs
  as `NOT IN` parameters to Postgres. Fix: remove `.ToListAsync()`, keep it as `IQueryable`
  so EF composes it as a SQL subquery instead.

## Infrastructure

- [ ] **Replace personal GCS OAuth credentials with a service account key**
  The `GCS_CREDENTIALS_JSON` GitHub secret currently holds personal OAuth credentials
  (`authorized_user` type from `gcloud auth application-default login`). These are tied
  to a personal Google account and could break if the token is revoked.
  
  To fix: Go to Google Cloud Console → IAM & Admin → Service Accounts → create a new
  service account, grant it **Storage Object Admin** on the `partyup` bucket, download
  the JSON key, and replace the `GCS_CREDENTIALS_JSON` secret with it.
