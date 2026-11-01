# INTEGRAL UI System

## Thesis

INTEGRAL is a campus library circulation workspace for staff and students. This edition treats the workspace like a colorful campus collection atlas: deep navy and cobalt anchor navigation, while jade, violet, coral, and honey distinguish real categories and activity. Warm paper surfaces keep dense staff data legible; the student portal uses brighter, touch-friendly panels.

Allowed patterns: layered gradients and softly raised panels for the welcome and student hero; restrained radial color fields on the login backdrop; live WIB time on the dashboard; distinct category and status colors; a compact staff sidebar and persistent mobile student navigation; and the existing spinner only during asynchronous work. The selected palette and type direction are assumptions based on the request for a fresh, more colorful redesign; the user has not separately validated the exact visual thesis.

## Visual tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| Ink | `#1E2442` | `#EEF0FF` | Primary text |
| Muted | `#5C6381` | `#B8C2E4` | Supporting text and metadata |
| Canvas | `#F5F1E8` | `#151C32` | Main application background |
| Surface | `#FFFDF9` | `#202944` | Cards, menus, and dialogs |
| Raised surface | `#FFFFFF` | `#293451` | Inputs and elevated panels |
| Line | `#E4DDCF` | `#3A4664` | Boundaries and dividers |
| Navy | `#182044` | `#202B5A` | Brand anchor |
| Cobalt | `#313DA8` | `#6475E9` | Navigation and primary actions |
| Violet | `#7555D5` | `#9A7CEB` | Secondary emphasis |
| Hero gradient | `#182044` → `#313DA8` → `#523DAA` | Same | High-contrast welcome and navigation surfaces |
| Action gradient | `#313DA8` → `#6043B4` | Same | White-text primary actions |
| Student gradient | `#14605F` → `#313DA8` → `#523DAA` | Same | High-contrast student welcome |
| Jade | `#147D78` | `#70D1BF` | Positive and circulation emphasis |
| Coral | `#F07352` | `#FF9477` | Warm accent and distinct categories |
| Honey | `#EFBB4D` | `#FFD078` | Warm accent, focus, and active details |
| Blue wash | `#E9EDFF` | `#26315C` | Collection and metric grouping |
| Mint wash | `#E6F3EC` | `#1C413E` | Returned/positive grouping |
| Peach wash | `#FFE7DD` | `#4A303B` | Delayed/damage grouping |
| Violet wash | `#EFE9FF` | `#372E55` | Secondary grouping |
| Gold wash | `#FFF3D1` | `#423A2A` | Active and due-soon grouping |
| Aqua wash | `#DFF3F1` | `#213C4B` | Circulation and student grouping |
| Blue gradient stop | `#DDE4FF` | `#303C70` | End of blue collection/metric gradients |
| Mint gradient stop | `#D3EFE4` | `#27564F` | End of positive metric gradients |
| Peach gradient stop | `#FFDCD0` | `#633F48` | End of overdue/damage gradients |
| Gold gradient stop | `#FBE9B4` | `#594D32` | End of active metric gradients |
| Violet gradient stop | `#E9DCFF` | `#4A3B6D` | End of secondary metric gradients |
| Aqua gradient stop | `#CDEDEE` | `#2C5364` | End of circulation metric gradients |
| Blue foreground | `#293982` | `#E7EBFF` | Text on blue wash |
| Mint foreground | `#155E57` | `#D8FFF4` | Text on positive wash |
| Peach foreground | `#893E37` | `#FFE6DF` | Text on overdue/damage wash |
| Gold foreground | `#725115` | `#FFF0C5` | Text on active wash |
| Violet foreground | `#533C93` | `#F1E8FF` | Text on violet wash |
| Aqua foreground | `#145967` | `#DDF9FF` | Text on circulation wash |
| Danger text | `#A7353E` | `#FFAAA8` | Destructive actions and errors |
| Buttons | `#A96112`, `#B6404A`, `#2859A8` | Same | Warning, danger, and information actions |
| Hero/navigation text | `#FFFFFF` | `#FFFFFF` | Text on saturated gradients |
| Focus ring | `#7555D5` | `#FFD078` | Visible keyboard focus |

Use Georgia from the local system stack for editorial headings and the system sans-serif stack for controls, navigation, and data. Page titles range from 27-38 px, section titles 16-25 px, body text 13-14 px, and metadata 11-12 px. Use tabular numerals for the clock and counts. Spacing follows a 4/8 px rhythm; cards use 14-20 px radii and soft, colored depth. Shadows are `0 10px 26px rgba(37, 47, 105, 0.09)` and `0 16px 34px rgba(37, 47, 105, 0.15)` in light mode, with darker equivalents in dark mode. Shared input, table, and quiet-surface colors derive from the canvas, surface, line, and wash tokens above.

## Dashboard charts

Use native CSS horizontal bars without chart dependencies. Compare collection title counts (literature, KP reports, theses) and circulation transaction statuses (active, overdue, returned), sourced from the existing `getInitialData()` stats. Bar lengths are normalized to the largest category within each chart; exact values remain visible as text. Do not imply historical trends or use sample data when the app only supplies current totals. Keep labels and counts accessible independent of bar color, stack charts at tablet/mobile widths, and update them from `renderStats()`.

## Interaction

Use 140 ms ease-out transitions for color, borders, shadows, and chart-bar width when live counts refresh. Hover adds surface emphasis and shadow without moving layout. Preserve all navigation, menu, modal, and action behavior. Do not use parallax, scroll reveals, bounce, or decorative loops. Keep visible keyboard focus, honor reduced motion, and maintain mobile touch targets. The loading spinner may rotate only while the existing loading state is visible; the scanner indicator remains static while analysis is pending.

## Responsive behavior

Staff navigation remains a persistent gradient sidebar on larger screens and uses the existing drawer on small screens. Staff metrics collapse from three columns to two. Student navigation remains a bottom bar on mobile and reserves space for the device safe area. Keep tables horizontally scrollable rather than shrinking their content.

## Accessibility and contrast

Text contrast targets WCAG AA (4.5:1 for normal text, 3:1 for large text and UI boundaries). Preserve existing labels, button semantics, keyboard behavior, and live-time semantics. Status colors remain paired with text. Verify each light/dark palette pair and focus indicator after design changes.

## Scope

`index3.html` is an independent visual edition. Its application structure, IDs, event handlers, role checks, authentication, Apps Script calls, scanner, and student portal are presentation-only scope; do not change application behavior or other HTML editions as part of the redesign.
