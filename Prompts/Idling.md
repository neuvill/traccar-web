I've just added two backend features to our custom Traccar server fork (Java backend, not this repo) and need matching frontend support in this traccar-web app. Please explore this codebase first to find the right files/patterns — don't assume paths from a stock Traccar frontend, since this is our customized version. Here is exactly what changed on the backend, in full detail:

## 1. Motion status + duration (already existed, just extended)

Every `Position` object now carries these attributes (inside `position.attributes`, same bag as `speed`, `batteryLevel`, etc.):

- `motionStatus` — string, one of `"moving"`, `"idling"`, `"parked"`.
- `motionStatusChanged` — timestamp (ISO-8601 string over the API) of when the status last changed.
- `motionStatusDuration` — **long, milliseconds** — how long the device has been in the current status as of this position's fix time. Resets to `0` the moment the status changes. This is new.

Please find wherever this app currently displays `motionStatus` (or position attributes generally, e.g. a device list column, a status chip on the map popup, a device details panel) and:
- If `motionStatus` is already shown, add a duration display next to it using `motionStatusDuration`, formatted human-readable (e.g. "Idling · 12m 34s"). Use whatever duration-formatting helper/util this app already uses elsewhere (look for how trip/stop durations are formatted in reports — there should be an existing formatter, don't write a new one from scratch if one exists).
- Note: this duration is a snapshot as of the last received position, not live-ticking. If you want a live-updating counter between GPS fixes, compute `motionStatusDuration + (now - position.deviceTime)` client-side on a timer — check whether the app already does this pattern for anything similar (e.g. "last update X seconds ago").

## 2. New event type: idling event with notification

Backend now emits a new event type when a device stays in `"idling"` status longer than a configurable threshold (default 15 minutes). Details:

- Event type string: `"deviceIdle"` (matches existing naming convention like `"deviceOverspeed"`, `"deviceMoving"`, `"deviceStopped"`).
- The event fires **once** when the threshold is crossed (this is what triggers a live push/notification, same as any other event type).
- The event's `attributes` map contains `duration` — **long, milliseconds** — same convention as the report `duration` fields. Important behavioral detail: this value is written **twice only**: once when the event is created (≈ the threshold value, e.g. ~15min), and once more, in place, when the device finally leaves idling status (updated to the real total, e.g. 45min). So by the time a user reviews it in the event report after the fact, `duration` reflects the true total time spent idling — it is not the value from the trigger moment.
- Notification dispatch already works automatically on the backend for any registered notification of type `deviceIdle` — this is generic/type-driven, no backend registry to update. What's needed here is purely the frontend/UI side:

Please find and update, following existing patterns for other event types (especially `deviceOverspeed`, since it's the closest analog — also duration/threshold-based with a numeric attribute):

1. **Notification type registration** — wherever the notification settings UI builds its list of selectable event types (dropdown/checklist for "notify me when..."), add `deviceIdle` so users can enable/disable idling notifications, same as they can for overspeed, geofence, etc.
2. **Event report rendering** — in the events report table/list, there's likely a switch/case on event type to render the `attributes` column meaningfully (e.g. `deviceOverspeed` shows formatted speed, `driverChanged` shows the driver, `deviceFuelDrop` shows a delta). Add a case for `deviceIdle` that formats and displays `attributes.duration` (milliseconds) as human-readable duration, using the same duration formatter as above.
3. **Translations** — add a label for the event type (something like "Idling" / "Device Idle") to the translation file(s), following the exact key-naming convention already used for other event types (e.g. if `deviceOverspeed` maps to a key like `eventDeviceOverspeed`, mirror that for `deviceIdle`).
4. **Icon/color (if applicable)** — if event types have associated icons or colors anywhere (map markers, event list, notification bell), pick something sensible for idling (distinct from moving/stopped/overspeed) and wire it in following the existing pattern — only if this app already does icon/color mapping per event type; skip if not applicable.

Please implement this fully, verify it builds/lints cleanly, and give me a short summary of exactly which files you changed and why.
