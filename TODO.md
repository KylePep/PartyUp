# TODO

## Infrastructure

- [ ] **Replace personal GCS OAuth credentials with a service account key**
  The `GCS_CREDENTIALS_JSON` GitHub secret currently holds personal OAuth credentials
  (`authorized_user` type from `gcloud auth application-default login`). These are tied
  to a personal Google account and could break if the token is revoked.
  
  To fix: Go to Google Cloud Console → IAM & Admin → Service Accounts → create a new
  service account, grant it **Storage Object Admin** on the `partyup` bucket, download
  the JSON key, and replace the `GCS_CREDENTIALS_JSON` secret with it.
