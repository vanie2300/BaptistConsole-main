/* display-picker.js
 * Shared modern multi-select display picker used by the Bible and Hymn
 * presenters. Replaces the native <select multiple> with a dropdown whose
 * rows behave like checkboxes:
 *   - "Auto"       -> no explicit screens (project on the automatic display)
 *   - each screen  -> toggle that screen on/off (primary gets a badge)
 *   - "All Displays" -> select every screen
 *
 * Persistence and the legacy key mirror what the old <select> used:
 *   presenterDisplays  = "all" | comma-separated ids | (absent = Auto)
 *   presenterDisplayId = legacy single id (migrated once)
 */
(function () {
  "use strict";

  function sortDisplays(displays) {
    return [...displays]
      .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || a.id - b.id)
      .map((d) => {
        const name = d.label && String(d.label).trim()
          ? String(d.label).trim()
          : (d.size ? `${d.size.width}\u00D7${d.size.height}` : `Display ${d.id}`);
        return { id: d.id, label: name, isPrimary: Boolean(d.isPrimary) };
      });
  }

  function fullLabel(display) {
    return display.isPrimary ? `${display.label} (primary)` : display.label;
  }

  class DisplayPicker {
    constructor(mount, options) {
      this.mount = mount;
      this.options = options || {};
      this.api = this.options.api || window.presenterApi;
      this.onChange = typeof this.options.onChange === "function" ? this.options.onChange : null;

      this.displays = [];   // sorted descriptors [{id,label,isPrimary}]
      this.selected = [];   // array of display ids
      this.isAuto = true;   // true when no explicit screens are picked
      this.autoDisplayId = null;
      this.autoLabel = "";
      this.isOpen = false;

      this.buildRoot();
      this.bindOpenClose();
      this.bindHotplug();
      this.load();
    }

    // ---- DOM ----
    buildRoot() {
      this.root = document.createElement("div");
      this.root.className = "dp";
      this.mount.appendChild(this.root);

      this.trigger = document.createElement("button");
      this.trigger.type = "button";
      this.trigger.className = "dp-trigger";
      this.trigger.setAttribute("aria-haspopup", "listbox");
      this.trigger.setAttribute("aria-expanded", "false");
      this.triggerLabel = document.createElement("span");
      this.triggerLabel.className = "dp-trigger-label";
      this.triggerLabel.textContent = "Auto";
      const chevron = document.createElement("span");
      chevron.className = "dp-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      this.trigger.append(this.triggerLabel, chevron);
      this.trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggle();
      });
      this.root.appendChild(this.trigger);

      this.panel = document.createElement("div");
      this.panel.className = "dp-panel";
      this.panel.setAttribute("role", "listbox");
      this.panel.setAttribute("aria-multiselectable", "true");
      this.panel.addEventListener("change", (e) => this.onRowChange(e));
      this.root.appendChild(this.panel);
    }

    panelRow(opts) {
      const row = document.createElement("label");
      row.className = "dp-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "dp-input";
      if (opts.role) input.dataset.role = opts.role;
      if (opts.value !== undefined && opts.value !== null) input.dataset.value = String(opts.value);
      row.appendChild(input);

      const box = document.createElement("span");
      box.className = "dp-box";
      box.textContent = "\u2713";
      row.appendChild(box);

      const text = document.createElement("span");
      text.className = "dp-label";
      text.textContent = opts.label;
      row.appendChild(text);

      if (opts.hint) {
        const hint = document.createElement("span");
        hint.className = "dp-hint";
        hint.textContent = opts.hint;
        row.appendChild(hint);
      }
      if (opts.badge) {
        const badge = document.createElement("span");
        badge.className = "dp-badge";
        badge.textContent = opts.badge;
        row.appendChild(badge);
      }
      return row;
    }

    divider() {
      const div = document.createElement("div");
      div.className = "dp-divider";
      return div;
    }

    renderRows() {
      this.panel.innerHTML = "";
      this.panel.appendChild(this.panelRow({
        role: "auto",
        label: "Auto",
        hint: this.autoLabel || "",
      }));
      this.panel.appendChild(this.divider());
      this.displays.forEach((d) => {
        this.panel.appendChild(this.panelRow({
          value: d.id,
          label: d.label,
          badge: d.isPrimary ? "primary" : "",
        }));
      });
      this.panel.appendChild(this.divider());
      this.panel.appendChild(this.panelRow({ role: "all", label: "All Displays" }));
      this.updateChecks();
    }

    // ---- Selection ----
    onRowChange(e) {
      const input = e.target;
      if (!input || !input.classList.contains("dp-input")) return;
      if (input.dataset.role === "auto") {
        this.setSelection([], true);
      } else if (input.dataset.role === "all") {
        this.setSelection(input.checked ? this.displays.map((d) => d.id) : [], true);
      } else {
        const id = Number(input.dataset.value);
        let next = this.selected.slice();
        if (input.checked) {
          if (!next.includes(id)) next.push(id);
        } else {
          next = next.filter((x) => x !== id);
        }
        this.setSelection(next, true);
      }
    }

    setSelection(ids, persist) {
      const keep = new Set(ids.filter(Number.isFinite));
      this.selected = this.displays.filter((d) => keep.has(d.id)).map((d) => d.id);
      this.isAuto = this.selected.length === 0;
      this.updateChecks();
      if (persist) this.persist();
      this.pushApi();
      this.notify();
    }

    currentLabel() {
      if (this.isAuto) return this.autoLabel || "Auto";
      if (this.selected.length === 1) {
        const d = this.displays.find((x) => x.id === this.selected[0]);
        return d ? fullLabel(d) : "1 screen";
      }
      return `${this.selected.length} screens`;
    }

    updateChecks() {
      Array.from(this.panel.querySelectorAll(".dp-input")).forEach((input) => {
        let on = false;
        const row = input.closest(".dp-row");
        if (input.dataset.role === "auto") on = this.isAuto;
        else if (input.dataset.role === "all") {
          on = !this.isAuto && this.displays.length > 0 && this.selected.length === this.displays.length;
        } else {
          on = this.selected.indexOf(Number(input.dataset.value)) !== -1;
        }
        input.checked = on;
        if (row) row.classList.toggle("is-selected", on);
      });
      this.triggerLabel.textContent = this.currentLabel();
    }

    // ---- Persistence / API / events ----
    persist() {
      try {
        if (this.isAuto) {
          localStorage.removeItem("presenterDisplays");
          localStorage.removeItem("presenterDisplayId");
        } else {
          localStorage.setItem(
            "presenterDisplays",
            this.selected.length === this.displays.length ? "all" : this.selected.join(",")
          );
        }
      } catch (err) {
        // Ignore storage errors.
      }
    }

    pushApi() {
      if (!this.api || typeof this.api.setPresenterDisplay !== "function") return;
      const target = this.isAuto ? (this.autoDisplayId ?? null) : this.selected[0];
      this.api.setPresenterDisplay(target);
    }

    notify() {
      if (!this.onChange) return;
      this.onChange({
        ids: this.selected.slice(),
        isAuto: this.isAuto,
        label: this.currentLabel(),
        autoDisplayId: this.autoDisplayId,
        autoLabel: this.autoLabel,
      });
    }

    // ---- Loading / hotplug ----
    load() {
      if (!this.api || typeof this.api.getDisplays !== "function") return;
      this.api.getDisplays().then((displays) => {
        if (Array.isArray(displays) && displays.length > 0) this.initDisplays(displays);
      }).catch(() => {});
    }

    initDisplays(displays) {
      const sorted = sortDisplays(displays);
      const rawAuto = displays.find((d) => !d.isPrimary) || displays[0] || null;
      const autoDesc = rawAuto ? sorted.find((d) => d.id === rawAuto.id) : null;
      this.autoDisplayId = rawAuto ? rawAuto.id : null;
      this.autoLabel = autoDesc ? fullLabel(autoDesc) : "";
      this.displays = sorted;

      const wrap = document.getElementById("presenterDisplayWrap");
      if (wrap) wrap.hidden = false;

      this.renderRows();

      let ids = [];
      const stored = localStorage.getItem("presenterDisplays");
      if (stored === "all") {
        ids = sorted.map((d) => d.id);
      } else {
        const storedIds = String(stored || "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "" && Number.isFinite(Number(s)))
          .map(Number)
          .filter((n) => sorted.some((d) => d.id === n));
        if (storedIds.length > 0) {
          ids = storedIds;
        } else {
          const legacy = (() => {
            const raw = localStorage.getItem("presenterDisplayId");
            const n = raw ? Number(raw) : null;
            return Number.isFinite(n) ? n : null;
          })();
          if (legacy != null && sorted.some((d) => d.id === legacy)) {
            ids = [legacy];
          } else if (sorted.length === 1) {
            ids = [sorted[0].id];
          }
        }
      }
      this.setSelection(ids, false);
    }

    refresh() {
      if (!this.api || typeof this.api.getDisplays !== "function") return;
      this.api.getDisplays().then((displays) => {
        if (!Array.isArray(displays) || displays.length === 0) return;
        const newIds = new Set(displays.map((d) => d.id));
        const curIds = new Set(this.displays.map((d) => d.id));
        if (newIds.size === curIds.size && [...newIds].every((id) => curIds.has(id))) return;
        this.initDisplays(displays);
      }).catch(() => {});
    }

    bindHotplug() {
      if (this.hotHooked) return;
      this.hotHooked = true;
      let timer = null;
      const scheduleRefresh = () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.refresh(), 200);
      };
      const wrap = document.getElementById("presenterDisplayWrap");
      if (wrap) wrap.addEventListener("pointerdown", scheduleRefresh);
      window.addEventListener("focus", scheduleRefresh);
      document.addEventListener("visibilitychange", scheduleRefresh);
      if (this.api && typeof this.api.onDisplaysChanged === "function") {
        this.api.onDisplaysChanged(scheduleRefresh);
      }
    }

    bindOpenClose() {
      document.addEventListener("pointerdown", (e) => {
        if (this.isOpen && this.root && !this.root.contains(e.target)) this.close();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.close();
      });
    }

    open() {
      this.isOpen = true;
      this.root.dataset.open = "true";
      this.trigger.setAttribute("aria-expanded", "true");
    }

    close() {
      this.isOpen = false;
      if (this.root) delete this.root.dataset.open;
      this.trigger.setAttribute("aria-expanded", "false");
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    // ---- Public API (used by module callers) ----
    getSelectedIds() {
      return this.selected.slice();
    }
  }

  window.DisplayPicker = {
    create: (mount, options) => new DisplayPicker(mount, options),
  };
})();