# FEATURE REQUEST: Cross References Sidebar (Additive Enhancement Only)

## Objective

Add a new **Cross References** section beneath the existing chapter verse list in the right sidebar.

This is an enhancement to the existing Baptist Console application.

The goal is to provide contextual Bible references for the currently selected verse while preserving the current workflow and interface.

---

# CRITICAL REQUIREMENTS

## Existing UI Must Remain Intact

This feature is ADDITIVE ONLY.

Do NOT redesign the application.

Do NOT reorganize the layout.

Do NOT replace existing components.

Do NOT remove existing functionality.

The Cross References feature must be added without affecting any existing behavior.

---

# Existing Controls Protection (MANDATORY)

Do not remove, relocate, replace, hide, redesign, or alter any existing controls.

The following controls must remain visible and function exactly as they currently do.

## Left Panel

- Book selector
- Chapter selector
- Verse selector
- Display Verse button
- Auto Display toggle
- Display selector

## Center Panel

- Search bar
- Verse preview area
- Previous button
- Next button
- Font decrease button (A-)
- Font increase button (A+)
- Auto Fit button

## Right Panel

- Existing chapter verse list

No existing feature may be removed or replaced.

No UI regression is acceptable.

---

# Code Modification Restrictions (MANDATORY)

This task is a feature addition, not a refactor.

Do NOT:

- Rewrite existing components
- Refactor existing modules
- Rename existing variables
- Rename existing functions
- Rename existing classes
- Rename existing files
- Move existing files
- Reorganize project structure
- Replace working code with new implementations
- Modify existing business logic
- Change current UI behavior
- Change existing workflows
- Modify unrelated styling
- Optimize unrelated code
- Introduce architectural changes
- Perform cleanup work outside this feature
- Remove code because it appears unused
- Remove CSS because it appears unused
- Modernize unrelated code

Only modify the minimum amount of code required to integrate the Cross References feature.

Existing code should remain untouched whenever possible.

Implementation must be surgical and additive.

---

# Sidebar Layout

## Current Layout

```text
PROVERBS 26

[Verse List]
1
2
3
4
5
...
```

## New Layout

```text
PROVERBS 26

[Verse List]
1
2
3
4
5
...

────────────────────

▼ RELATED PASSAGES (4)

Deuteronomy 6:7
Teach them diligently unto thy children...

Ephesians 6:4
Bring them up in the nurture...

Psalm 78:4
We will not hide them from their children...
```

---

# Layout Rules

Keep the current chapter verse list exactly as it is.

Add a divider below the verse list.

Place the Cross References section below the divider.

The section must fit naturally within the existing sidebar design.

No layout shifts.

No resizing of existing panels.

No redesign of the current structure.

---

# Cross References Section

## Header

Display:

```text
▼ RELATED PASSAGES (4)
```

Where:

- Number reflects current reference count.
- Count updates dynamically.

---

# Collapse / Expand Behavior

The section should be collapsible.

Expanded:

```text
▼ RELATED PASSAGES (4)
```

Collapsed:

```text
▶ RELATED PASSAGES (4)
```

Requirements:

- Click header to toggle.
- Remember state during current session.
- Smooth animation.
- Preserve scroll position when possible.

---

# Reference Cards

Each reference should appear as a card.

Example:

```text
DEUTERONOMY 6:7

Teach them diligently unto thy children...
```

Card contents:

- Bible reference
- Verse preview
- Hover state
- Active state

---

# Styling Requirements

Must match the existing Baptist Console design.

Use:

- Existing dark theme
- Existing accent blue
- Existing typography
- Existing spacing system
- Existing border styling
- Existing shadow styling

Do not introduce a new design language.

Cards should feel native to the application.

---

# Hover State

When hovering:

- Subtle blue border
- Slight elevation
- Existing transition timing

No flashy effects.

---

# Active State

When selected:

- Blue border
- Slight blue highlight
- Clear visual distinction

---

# Verse Selection Workflow

When user selects a verse:

Example:

```text
Proverbs 22:6
```

System should:

1. Update center preview.
2. Highlight selected verse.
3. Query cross-reference dataset.
4. Populate Cross References section.
5. Update reference count.
6. Maintain smooth UI updates.

---

# Reference Selection Workflow

When user clicks:

```text
Ephesians 6:4
```

System should:

1. Load reference in preview panel.
2. Preserve original context.
3. Highlight selected reference.
4. Keep chapter navigation available.
5. Respect Auto Display settings.

---

# Auto Display Integration

## Auto Display OFF

Selecting a reference:

- Updates preview only.
- Does not update presentation display.

## Auto Display ON

Selecting a reference:

- Updates preview.
- Immediately updates presentation display.

---

# Empty State

If no references exist:

```text
RELATED PASSAGES

No cross references available.
```

Use subtle muted styling.

No errors.

No warnings.

---

# Loading State

While references are loading:

Display skeleton placeholders.

Example:

```text
████████████████
████████████████
████████████████
```

Avoid spinners whenever possible.

---

# Data Source

Support local JSON cross-reference data.

Example:

```json
{
  "Proverbs 22:6": [
    {
      "reference": "Deuteronomy 6:7",
      "preview": "Teach them diligently unto thy children..."
    },
    {
      "reference": "Ephesians 6:4",
      "preview": "Bring them up in the nurture..."
    }
  ]
}
```

---

# Performance Requirements

- Updates should feel instant.
- Avoid unnecessary re-renders.
- Cache loaded reference data.
- Handle large datasets efficiently.
- No noticeable lag.

---

# Edge Cases

Verify functionality with:

- Genesis 1:1
- Psalm 119
- John 3:16
- Revelation 22:21

Verify:

- Long chapters
- Many verses
- Many references
- No references
- Rapid verse switching
- Search-selected verses
- Previous/Next navigation

---

# Mandatory Post-Implementation Review

After implementation, perform a complete review before considering the task finished.

The task is NOT complete immediately after the feature appears to work.

---

# UI Review Checklist

Verify:

- Alignment consistency
- Spacing consistency
- Panel sizing consistency
- No clipping
- No overflow
- No overlapping elements
- No visual regressions
- Consistent typography
- Consistent colors
- Consistent shadows
- Consistent borders

---

# Functional Review Checklist

Verify:

## Left Panel

- Book selection works
- Chapter selection works
- Verse selection works
- Display Verse button works
- Auto Display works
- Display selector works

## Center Panel

- Search works
- Verse preview works
- Previous button works
- Next button works
- Font decrease works
- Font increase works
- Auto Fit works

## Right Panel

- Verse navigation works
- Verse highlighting works
- Cross references load correctly
- Cross references update correctly
- Empty state works
- Loading state works
- Collapse/expand works
- Reference selection works

---

# Regression Testing

Confirm that this feature has not altered:

- Existing navigation
- Existing presentation behavior
- Existing display controls
- Existing search functionality
- Existing styling
- Existing keyboard interactions
- Existing performance

No regressions are acceptable.

---

# Completion Criteria

This feature is complete only when:

- Cross References appear below the verse list.
- Existing functionality remains untouched.
- Existing UI remains intact.
- All controls still work.
- No regressions exist.
- UI remains visually consistent.
- Edge cases have been tested.
- The feature feels like part of the original application rather than an add-on.