# Data Overview Raw Dataset Design

Date: 2026-07-29
Status: Ready for user review

## Summary

The project should retire the old user-facing "personal data source" concept as a fused source for analysis, prediction, and training. User uploads should become a raw dataset library that is used only by the Data Overview page.

Data Overview keeps the official dataset as the default. A logged-in user may optionally select one uploaded MCD dataset to drive the whole Data Overview page. Uploaded OpenMARS and NOMAD datasets are not whole-page sources; they are only additional ozone sources for the 3D multi-source display.

Training and prediction no longer consume ordinary user-uploaded data. Their fused datasets are server-side assets managed by administrators.

## Current Behavior

The current implementation mixes several concepts:

- `data_source=personal` exists across Data Overview, Predict, Model Training, and some analysis routes.
- Uploading a valid `.nc` file can enqueue `personal_cache` rebuild work.
- `PersonalDataSourceService` can fuse personal OpenMARS and MCD, or fall back to system OpenMARS plus personal MCD.
- Frontend copy says uploaded data can be used by overview, analysis, prediction, and training pages.
- Prediction also has a personal prewarm endpoint that can trigger cache building.

This creates two problems:

- The product meaning is unclear: "personal data source" sometimes means raw upload, sometimes means fused data, sometimes means a fallback hybrid.
- The backend can do heavy cache building and warmup after ordinary user upload, which increases the risk of long freezes in data-management flows.

## Goals

- Keep official Data Overview data as the default experience.
- Let users upload raw MCD, OpenMARS, and NOMAD datasets.
- Let uploaded MCD optionally drive the full Data Overview visualization page.
- Let uploaded OpenMARS and NOMAD appear only in the 3D ozone multi-source display.
- Prevent ordinary user uploads from entering training, prediction, or fused-source pipelines.
- Remove or disable user-facing `personal` source switching outside Data Overview.
- Stop ordinary upload/delete/review operations from triggering personal fusion cache rebuilds.
- Keep administrator-managed fused datasets available for training and prediction through server configuration or admin workflows.

## Non-Goals

- Do not build a general user-controlled fusion pipeline.
- Do not allow normal users to replace the training or prediction dataset.
- Do not merge user uploads into official data automatically.
- Do not make OpenMARS or NOMAD control the full Data Overview page.
- Do not require all right-side Data Overview charts to support OpenMARS or NOMAD as primary sources.

## Data Source Rules

Official data:

- Official MCD remains the default full-page Data Overview source.
- Official OpenMARS and NOMAD remain available as official ozone sources where currently supported.
- Administrator-managed fused data remains the source for training and prediction.

User-uploaded data:

- Uploaded MCD can be selected as the full-page Data Overview source.
- Uploaded OpenMARS can be selected only as a 3D ozone source.
- Uploaded NOMAD can be selected only as a 3D ozone source.
- Uploaded data remains private to the uploader unless contribution/review explicitly makes it public.
- Uploaded data is not fused with official data for ordinary users.
- Uploaded data is not used by training or prediction.

## Recommended Approach

Use an "official default plus optional raw overview source" model.

Data Overview will have two user-facing source areas:

- Page source: official MCD by default, or one selected user-uploaded MCD.
- 3D ozone sources: official and/or selected user-uploaded OpenMARS and NOMAD overlays.

This keeps the user workflow simple:

- If the user wants all Data Overview charts to use their data, they upload/select MCD.
- If the user wants 3D ozone comparison, they upload/select OpenMARS or NOMAD.
- If they train or predict, the app uses administrator-managed server data only.

This approach is better than keeping `personal` because it names the actual behavior. It is also safer than a full rewrite because the existing `UserDataService` already supports on-demand single-file visualization and can be extended toward Data Overview parity.

## Alternatives Considered

### Minimal UI Cleanup

Hide `personal` switching from training and prediction, but keep the existing Data Management preview behavior.

Tradeoff: Fast, but Data Overview would still not clearly use uploaded MCD as a page source. The old `personal` backend concepts would also remain easy to accidentally trigger.

### Full Data Asset Rewrite

Create a new asset-management subsystem for official, contributed, private, and admin-fused datasets.

Tradeoff: Clean long-term architecture, but too large for the current change. It would delay fixing the immediate freeze and concept-confusion problems.

### Recommended: Raw Overview Dataset Library

Rename and narrow the existing upload path, remove user-facing fusion behavior, and extend raw uploaded datasets into Data Overview.

Tradeoff: Requires several coordinated frontend and backend edits, but it matches the product direction and avoids a large rewrite.

## Backend Design

Upload validation:

- Extend data-type detection to support `nomad` in addition to `mcd` and `openmars`.
- Keep MCD validation strict enough for full Data Overview use: latitude, longitude, Ls, variables, grid compatibility, and useful valid-value coverage.
- Keep OpenMARS/NOMAD validation focused on ozone multi-source display compatibility.

Raw dataset service:

- Treat `UserDataService` as the user raw-dataset visualization service.
- Extend it so uploaded MCD can provide all payload shapes needed by Data Overview right-side charts.
- Extend it so uploaded OpenMARS/NOMAD can provide 3D ozone overlay payloads.
- Keep file loading on demand and off the event loop using background threads.
- Cache parsed datasets with bounded LRU behavior, not permanent fused cache directories.

Old personal fusion service:

- Do not trigger `personal_cache` rebuild from ordinary upload, delete, contribution, review, revoke, or prediction prewarm.
- Do not expose `personal` as a valid user-facing source for training or prediction.
- Keep `PersonalDataSourceService` only if needed temporarily for migration or admin-only internal experiments; otherwise mark it deprecated and remove references in a later cleanup.

Training and prediction:

- Accept only official/admin-managed data sources from normal API calls.
- If `data_source=personal` is sent by old frontend code or stale clients, reject it clearly or normalize it to `default`; prefer rejecting in API boundaries during development so misuse is visible.
- Training task metadata should no longer record ordinary user raw uploads as `_data_source=personal`.
- Prediction for trained models should use the dataset associated with the training task or official/admin-managed data, not user raw uploads.

Admin-managed fused data:

- Keep administrator fusion outside the normal user upload flow.
- Server configuration or admin endpoints may point training/prediction to approved fused assets.
- Ordinary users can contribute data for review, but approval does not automatically change runtime training/prediction data unless an administrator updates the server asset set.

## Frontend Design

Data Management page:

- Rename the concept from personal fused source to raw Data Overview datasets.
- Upload UI should say supported raw source types are MCD, OpenMARS, and NOMAD.
- Remove warmup/progress UI related to personal source cache building.
- Dataset cards should show where each type can be used:
  - MCD: Data Overview full-page visualization.
  - OpenMARS: Data Overview 3D ozone source.
  - NOMAD: Data Overview 3D ozone source.
- Remove text that says uploads can be used by prediction or training.
- Contribution/review can remain, but it should be described as public asset submission, not automatic fusion.

Data Overview page:

- Default state loads official MCD.
- Add a source selector that can choose official MCD or one user-uploaded MCD.
- When a user-uploaded MCD is selected, right-side charts request user-dataset-backed payloads.
- 3D ozone controls can choose official and uploaded OpenMARS/NOMAD sources for multi-source display.
- If a selected uploaded dataset cannot support a specific chart, show a clear unavailable state instead of silently falling back.

Prediction page:

- Remove user-facing default/personal source toggle.
- Remove personal source availability checks and prewarm behavior.
- Prediction requests should not pass `data_source=personal`.
- Existing trained-model comparison labels can still display historical metadata, but new tasks should not generate personal-source metadata.

Model Training page:

- Remove user-facing default/personal source toggle.
- Keep training dataset choices that map to administrator/server-managed datasets.
- New training requests should send only supported official/admin data-source values.
- UI copy should explain that training data is maintained by the server/admin, not by personal upload.

## Data Flow

Default Data Overview:

1. User opens Data Overview.
2. Frontend requests official overview endpoints.
3. Backend reads official MCD overview service.
4. All charts render official data.

User MCD Data Overview:

1. User uploads a valid MCD file.
2. Upload record is saved as a raw dataset.
3. No personal fusion cache is built.
4. User selects that MCD in Data Overview.
5. Frontend requests user raw-dataset overview endpoints.
6. Backend reads the selected MCD on demand and returns chart payloads.

User OpenMARS/NOMAD 3D Ozone:

1. User uploads a valid OpenMARS or NOMAD file.
2. Upload record is saved as a raw dataset.
3. User selects it in 3D ozone source controls.
4. Backend returns ozone overlay payloads from that file.
5. The globe displays it alongside official or other selected ozone sources.

Training/Prediction:

1. User starts training or runs prediction.
2. Frontend sends official/admin-managed data-source choices only.
3. Backend rejects ordinary personal raw data as a training/prediction source.
4. Backend uses server-managed official or admin-fused assets.

## Error Handling

- If no user is logged in, user-upload selectors should ask the user to sign in.
- If an uploaded MCD lacks variables required by a chart, that chart should show "not available for this dataset".
- If OpenMARS/NOMAD is selected outside 3D ozone display, the UI should prevent the action.
- If stale clients send `data_source=personal` to training or prediction, the backend should return a clear 400-level error.
- Heavy file parsing should run off the async event loop to avoid freezing unrelated API requests.
- Upload validation failures should remain visible in Data Management and should not enqueue downstream processing.

## Testing Plan

Backend tests:

- Valid MCD upload is accepted as a Data Overview raw source.
- Valid OpenMARS upload is accepted as a 3D ozone source.
- Valid NOMAD upload is accepted as a 3D ozone source.
- Upload/delete/review no longer calls `enqueue_personal_cache_rebuild`.
- Training rejects or does not accept `data_source=personal`.
- Prediction rejects or does not accept `data_source=personal`.
- User raw MCD endpoints return Data Overview-compatible payloads.
- User OpenMARS/NOMAD endpoints return 3D ozone-compatible payloads.
- Slow `.nc` parsing does not block unrelated lightweight API calls.

Frontend tests:

- Data Management copy no longer says uploads feed prediction/training.
- Data Management no longer shows personal-source warmup UI.
- Data Overview defaults to official MCD.
- Data Overview can select a user MCD for full-page visualization.
- OpenMARS/NOMAD options are scoped to 3D ozone display.
- Prediction page no longer exposes personal source switching.
- Model Training page no longer exposes personal source switching.

## Migration Notes

- Existing upload records can remain in place.
- Existing `personal_cache` directories can be ignored and cleaned manually or by a later maintenance task.
- Historical training tasks with `_data_source=personal` may still appear in history; the UI should display them as historical metadata, not as a currently selectable mode.
- Existing `personal_source_build_states` database rows can remain temporarily; new ordinary uploads should stop updating them.

## Open Decisions Resolved

- Data Overview default source: official MCD.
- User uploaded MCD role: optional full-page Data Overview source.
- User uploaded OpenMARS role: 3D ozone multi-source display only.
- User uploaded NOMAD role: 3D ozone multi-source display only.
- Training/prediction data role: administrator/server-managed fused assets only.
- Ordinary user fusion: not supported.
