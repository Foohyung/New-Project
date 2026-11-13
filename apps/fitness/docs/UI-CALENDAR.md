# Calendar UI guideline

Whenever a task adds or changes a date or date-range picker, use the app's custom calendar UI. Do not use a native `<input type="date">` or rely on browser-provided date picker styling.

## Existing components

- `DatePickerField` in `src/web/components/ui/ui/ui.calendar.tsx` for one date.
- `DateRangePicker` in the same file for a date range.
- `DatePickerGroup` to coordinate multiple date fields in one form so only one calendar popover is open at a time.

## UX requirements

- Keep the calendar visually consistent with the app: Thai labels, Buddhist Era year, clear selected/today states, month navigation, and responsive popover/sheet behavior.
- Preserve keyboard navigation and accessible labels from the shared components.
- Pass min/max date constraints through the shared component API when relevant.
- Keep submitted date values in `YYYY-MM-DD` format and validate them again on the server.
- Reuse or extend the shared calendar rather than making a one-off native or custom picker.

## Verification

- Check the relevant form on desktop and mobile when browser preview is available.
- Run the focused lint and typecheck for the changed UI.
- Search the affected UI for `type="date"` to ensure no native picker was introduced.
